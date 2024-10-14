import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { ConfigModule } from "@nestjs/config";

/**
 * The root module that imports all other modules
 */
@Module({
    imports: [DatabaseModule, AuthModule, ConfigModule.forRoot()],
})
export class AppModule {}
