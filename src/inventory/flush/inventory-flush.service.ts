import {
    Injectable,
    Logger,
    OnApplicationBootstrap,
    OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../../database/service/database.service";
import { InventoryStore } from "../store/inventory.store";

/**
 * Background worker that persists dirty in-memory totals to MySQL in batched
 * transactions. Writes absolute amounts, so a retried flush is idempotent.
 */
@Injectable()
export class InventoryFlushService
    implements OnApplicationBootstrap, OnModuleDestroy
{
    private readonly logger = new Logger(InventoryFlushService.name);
    private readonly maxBatch?: number;
    private readonly intervalMs: number;
    private static readonly MAX_BACKOFF_MS = 10_000;
    private backoffMs = 0;
    private stopped = false;
    private timer?: ReturnType<typeof setTimeout>;

    public constructor(
        private readonly store: InventoryStore,
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService,
    ) {
        this.maxBatch = InventoryFlushService.parsePositiveInt(
            this.configService.get<string>("INVENTORY_FLUSH_MAX_BATCH"),
        );
        this.intervalMs =
            InventoryFlushService.parsePositiveInt(
                this.configService.get<string>("INVENTORY_FLUSH_INTERVAL_MS"),
            ) ?? 500;
    }

    private static parsePositiveInt(
        raw: string | undefined,
    ): number | undefined {
        if (raw === undefined) {
            return undefined;
        }
        const parsed = Number(raw);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
    }

    public onApplicationBootstrap(): void {
        this.scheduleNext(this.intervalMs);
    }

    public async onModuleDestroy(): Promise<void> {
        this.stopped = true;
        if (this.timer) {
            clearTimeout(this.timer);
        }
        try {
            await this.flush();
        } catch (error) {
            this.logger.error("Final flush on shutdown failed", error as Error);
        }
    }

    private scheduleNext(delay: number): void {
        if (this.stopped) {
            return;
        }
        this.timer = setTimeout(() => void this.tick(), delay);
    }

    private async tick(): Promise<void> {
        try {
            await this.flush();
            this.backoffMs = 0;
        } catch (error) {
            this.backoffMs = Math.min(
                this.backoffMs === 0 ? this.intervalMs : this.backoffMs * 2,
                InventoryFlushService.MAX_BACKOFF_MS,
            );
            this.logger.error(
                `Flush failed, retrying in ${this.backoffMs}ms`,
                error as Error,
            );
        } finally {
            this.scheduleNext(this.backoffMs || this.intervalMs);
        }
    }

    /**
     * Snapshots dirty keys and writes their absolute totals in one transaction,
     * clearing them on success. Throws (leaving keys dirty) on failure.
     */
    public async flush(): Promise<void> {
        const refs = this.store.takeDirtySnapshot(this.maxBatch);
        if (refs.length === 0) {
            return;
        }
        await this.databaseService.$transaction(
            refs.map((ref) =>
                this.databaseService.dedicatedStorage.upsert({
                    where: {
                        clusterId_ownerId_resourceId: {
                            clusterId: ref.clusterId,
                            ownerId: ref.ownerId,
                            resourceId: ref.resourceId,
                        },
                    },
                    create: {
                        clusterId: ref.clusterId,
                        ownerId: ref.ownerId,
                        resourceId: ref.resourceId,
                        amount: ref.value,
                    },
                    update: { amount: ref.value },
                }),
            ),
        );
        this.store.clearDirty(refs);
    }
}
