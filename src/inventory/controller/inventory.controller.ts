import { Body, Controller, Get, Post } from "@nestjs/common";
import { ClusterId } from "../../auth/decorator/cluster-id.decorator";
import { StorageDto } from "../dto/storage.dto";
import { InventoryService } from "../service/inventory.service";

/**
 * The inventory controller that handles inventory requests
 */
@Controller("inventory")
export class InventoryController {
    /**
     * Initializes the inventory controller
     * @param inventoryService The inventory service
     */
    public constructor(private readonly inventoryService: InventoryService) {}

    /**
     * @see InventoryService.getInventory
     */
    @Get()
    public async getInventory(
        @ClusterId() clusterId: string,
    ): Promise<StorageDto[]> {
        return this.inventoryService.getInventory(clusterId);
    }

    /**
     * @see InventoryService.updateInventory
     * @param clusterId
     * @param storage
     */
    @Post()
    public async updateInventory(
        @ClusterId() clusterId: string,
        @Body() storage: StorageDto,
    ): Promise<void> {
        return this.inventoryService.updateInventory(clusterId, storage);
    }
}
