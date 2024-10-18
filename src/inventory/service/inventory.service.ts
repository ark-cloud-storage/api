import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "../../database/service/database.service";
import { StorageDto } from "../dto/storage.dto";
import { DedicatedStorageDto } from "../dto/dedicated-storage.dto";
import { EventEmitter2 } from "@nestjs/event-emitter";

/**
 * The inventory service that provides inventory management
 */
@Injectable()
export class InventoryService {
    /**
     * The logger instance used to log messages
     * @private
     */
    private readonly logger = new Logger(InventoryService.name);

    /**
     * Initializes the inventory service
     * @param databaseService The database service
     * @param eventEmitter The event emitter
     */
    public constructor(
        private readonly databaseService: DatabaseService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    /**
     * Retrieves all inventory items for the specified cluster
     * @param clusterId The ID of the cluster
     */
    public async getInventory(clusterId: string): Promise<StorageDto[]> {
        const storage: StorageDto[] = [];
        const dedicatedStorage =
            await this.databaseService.dedicatedStorage.findMany({
                where: { clusterId },
            });
        for (const storageItem of dedicatedStorage) {
            storage.push(DedicatedStorageDto.fromDatabase(storageItem));
        }
        return storage;
    }

    /**
     * Updates the inventory for the specified cluster
     * @param clusterId The ID of the cluster
     * @param storage The storage to update
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
     * Sets the dedicated storage for the specified cluster
     * @param clusterId The ID of the cluster
     * @param storage The dedicated storage to set
     * @private
     */
    private async setDedicatedStorage(
        clusterId: string,
        storage: DedicatedStorageDto,
    ): Promise<void> {
        this.logger.log(
            `Updating ${storage.resourceId} dedicated storage for cluster ${clusterId} and owner ${storage.ownerId} by ${storage.amount} units`,
        );
        const updateStorage =
            await this.databaseService.dedicatedStorage.upsert({
                where: {
                    resourceId_clusterId: {
                        clusterId,
                        resourceId: storage.resourceId,
                    },
                },
                create: {
                    clusterId: clusterId,
                    resourceId: storage.resourceId,
                    ownerId: storage.ownerId,
                    amount: storage.amount,
                },
                update: {
                    amount: {
                        increment: storage.amount,
                    },
                },
            });
        this.emitInventoryUpdate(
            clusterId,
            DedicatedStorageDto.fromDatabase(updateStorage),
        );
    }

    /**
     * Emits an inventory update event
     * @param clusterId The ID of the cluster
     * @param storage The updated storage
     * @private
     */
    private emitInventoryUpdate(clusterId: string, storage: StorageDto): void {
        this.eventEmitter.emit("inventory.updated", clusterId, storage);
    }
}
