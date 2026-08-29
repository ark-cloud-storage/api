import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "../../database/service/database.service";
import { DedicatedStorageDto } from "../dto/dedicated-storage.dto";
import { StorageDto } from "../dto/storage.dto";

const INT_MIN = -2_147_483_648;
const INT_MAX = 2_147_483_647;

interface Entry {
    ownerId: number;
    resourceId: string;
    value: number;
    version: number;
    dirty: boolean;
}

/**
 * A reference to a dirty entry captured for a flush.
 */
export interface DirtyRef {
    clusterId: string;
    ownerId: number;
    resourceId: string;
    value: number;
    version: number;
}

/**
 * In-memory authoritative store of inventory totals. A single backend process
 * owns these totals; MySQL is the durable mirror written behind by the flush
 * worker.
 */
@Injectable()
export class InventoryStore {
    private readonly logger = new Logger(InventoryStore.name);
    private readonly clusters = new Map<string, Map<string, Entry>>();
    private readonly loaded = new Set<string>();
    private readonly loading = new Map<string, Promise<void>>();

    public constructor(private readonly databaseService: DatabaseService) {}

    /**
     * Hydrates a cluster's rows from the database into memory once. Idempotent;
     * concurrent calls for the same cluster share a single load.
     */
    public async ensureLoaded(clusterId: string): Promise<void> {
        if (this.loaded.has(clusterId)) {
            return;
        }
        const existing = this.loading.get(clusterId);
        if (existing) {
            return existing;
        }
        const promise = this.load(clusterId).finally(() => {
            this.loading.delete(clusterId);
        });
        this.loading.set(clusterId, promise);
        return promise;
    }

    private async load(clusterId: string): Promise<void> {
        const rows = await this.databaseService.dedicatedStorage.findMany({
            where: { clusterId },
        });
        const map = new Map<string, Entry>();
        for (const row of rows) {
            map.set(this.key(row.ownerId, row.resourceId), {
                ownerId: row.ownerId,
                resourceId: row.resourceId,
                value: row.amount,
                version: 0,
                dirty: false,
            });
        }
        this.clusters.set(clusterId, map);
        this.loaded.add(clusterId);
    }

    /**
     * Returns the current inventory for a cluster from memory.
     */
    public getClusterInventory(clusterId: string): StorageDto[] {
        const map = this.clusters.get(clusterId);
        if (!map) {
            return [];
        }
        const result: StorageDto[] = [];
        for (const entry of map.values()) {
            result.push(
                new DedicatedStorageDto(
                    entry.ownerId,
                    entry.resourceId,
                    entry.value,
                ),
            );
        }
        return result;
    }

    private key(ownerId: number, resourceId: string): string {
        return `${ownerId}\u0000${resourceId}`;
    }

    /**
     * Applies a delta to the in-memory total, clamped to the Int range, bumps
     * the entry version and marks it dirty. The caller must have ensureLoaded
     * the cluster first.
     */
    public applyDelta(
        clusterId: string,
        ownerId: number,
        resourceId: string,
        delta: number,
    ): number {
        let map = this.clusters.get(clusterId);
        if (!map) {
            map = new Map<string, Entry>();
            this.clusters.set(clusterId, map);
        }
        const key = this.key(ownerId, resourceId);
        const entry: Entry = map.get(key) ?? {
            ownerId,
            resourceId,
            value: 0,
            version: 0,
            dirty: false,
        };
        const raw = entry.value + delta;
        const clamped = this.clamp(raw);
        if (clamped !== raw) {
            this.logger.warn(
                `Clamped amount for ${clusterId}/${ownerId}/${resourceId}`,
            );
        }
        entry.value = clamped;
        entry.version += 1;
        entry.dirty = true;
        map.set(key, entry);
        return entry.value;
    }

    /**
     * Synchronously collects dirty entries for a flush, up to maxBatch.
     */
    public takeDirtySnapshot(maxBatch?: number): DirtyRef[] {
        const refs: DirtyRef[] = [];
        for (const [clusterId, map] of this.clusters) {
            for (const entry of map.values()) {
                if (!entry.dirty) {
                    continue;
                }
                refs.push({
                    clusterId,
                    ownerId: entry.ownerId,
                    resourceId: entry.resourceId,
                    value: entry.value,
                    version: entry.version,
                });
                if (maxBatch !== undefined && refs.length >= maxBatch) {
                    return refs;
                }
            }
        }
        return refs;
    }

    /**
     * Clears the dirty flag for entries unchanged since the snapshot. Entries
     * whose version has moved on stay dirty for the next flush.
     */
    public clearDirty(refs: DirtyRef[]): void {
        for (const ref of refs) {
            const entry = this.clusters
                .get(ref.clusterId)
                ?.get(this.key(ref.ownerId, ref.resourceId));
            if (entry && entry.version === ref.version) {
                entry.dirty = false;
            }
        }
    }

    private clamp(value: number): number {
        if (value > INT_MAX) {
            return INT_MAX;
        }
        if (value < INT_MIN) {
            return INT_MIN;
        }
        return value;
    }
}
