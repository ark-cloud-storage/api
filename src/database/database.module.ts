import { Module } from "@nestjs/common";
import { DatabaseService } from "./service/database.service";

/**
 * The database module that provides the database service
 */
@Module({
    providers: [DatabaseService],
    exports: [DatabaseService],
})
export class DatabaseModule {}
