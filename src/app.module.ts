import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { ConfigModule } from "@nestjs/config";
import { InventoryModule } from "./inventory/inventory.module";
import { EventEmitterModule } from "@nestjs/event-emitter";

/**
 * The root module that imports all other modules
 */
@Module({
    imports: [
        ConfigModule.forRoot(),
        EventEmitterModule.forRoot(),
        DatabaseModule,
        AuthModule,
        InventoryModule,
    ],
})
export class AppModule {}
