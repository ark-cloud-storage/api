import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "../../database/service/database.service";
import { DedicatedStorageDto } from "../dto/dedicated-storage.dto";
import { StorageDto } from "../dto/storage.dto";

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
}
