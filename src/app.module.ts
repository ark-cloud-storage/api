import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";

/**
 * The root module that imports all other modules
 */
@Module({
    imports: [DatabaseModule, AuthModule],
})
export class AppModule {}
