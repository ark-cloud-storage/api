import { Module } from "@nestjs/common";
import { InventoryService } from "./service/inventory.service";
import { InventoryGateway } from "./gateway/inventory.gateway";
import { InventoryController } from "./controller/inventory.controller";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { EventEmitterModule } from "@nestjs/event-emitter";

/**
 * The inventory module that provides the inventory service, gateway, and controller
 */
@Module({
    imports: [AuthModule, DatabaseModule, EventEmitterModule],
    providers: [InventoryService, InventoryGateway],
    controllers: [InventoryController],
})
export class InventoryModule {}
