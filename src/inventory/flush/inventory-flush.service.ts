import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../../database/service/database.service";
import { InventoryStore } from "../store/inventory.store";

/**
 * Background worker that persists dirty in-memory totals to MySQL in batched
 * transactions. Writes absolute amounts, so a retried flush is idempotent.
 */
@Injectable()
export class InventoryFlushService {
    private readonly logger = new Logger(InventoryFlushService.name);
    private readonly maxBatch?: number;

    public constructor(
        private readonly store: InventoryStore,
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService,
    ) {
        const raw = this.configService.get<string>("INVENTORY_FLUSH_MAX_BATCH");
        const parsed = raw !== undefined ? Number(raw) : NaN;
        this.maxBatch = Number.isFinite(parsed) ? parsed : undefined;
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
