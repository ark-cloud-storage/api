import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InventoryStore } from "../store/inventory.store";
import { StorageDto } from "../dto/storage.dto";
import { DedicatedStorageDto } from "../dto/dedicated-storage.dto";

/**
 * The inventory service that provides inventory management
 */
@Injectable()
export class InventoryService {
    private readonly logger = new Logger(InventoryService.name);

    public constructor(
        private readonly store: InventoryStore,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    /**
     * Retrieves all inventory items for the specified cluster from memory,
     * hydrating the cluster from the database on first access.
     */
    public async getInventory(clusterId: string): Promise<StorageDto[]> {
        await this.store.ensureLoaded(clusterId);
        return this.store.getClusterInventory(clusterId);
    }

    /**
     * Updates the inventory for the specified cluster
     */
    public async updateInventory(
        clusterId: string,
        storage: StorageDto,
    ): Promise<void> {
        switch (storage.type) {
            case "dedicated":
                await this.setDedicatedStorage(
                    clusterId,
                    storage as DedicatedStorageDto,
                );
                break;
            default:
                throw new BadRequestException("Invalid storage type");
        }
    }

    /**
     * Applies the delta to the in-memory total and emits the new total
     * immediately; persistence happens asynchronously in the flush worker.
     */
    private async setDedicatedStorage(
        clusterId: string,
        storage: DedicatedStorageDto,
    ): Promise<void> {
        this.logger.log(
            `Updating ${storage.resourceId} dedicated storage for cluster ${clusterId} and owner ${storage.ownerId} by ${storage.amount} units`,
        );
        await this.store.ensureLoaded(clusterId);
        const total = this.store.applyDelta(
            clusterId,
            storage.ownerId,
            storage.resourceId,
            storage.amount,
        );
        this.emitInventoryUpdate(
            clusterId,
            new DedicatedStorageDto(storage.ownerId, storage.resourceId, total),
        );
    }

    private emitInventoryUpdate(clusterId: string, storage: StorageDto): void {
        this.eventEmitter.emit("inventory.updated", clusterId, storage);
    }
}
