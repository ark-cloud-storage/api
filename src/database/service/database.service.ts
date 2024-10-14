import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * The database service that provides the Prisma client
 */
@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit {
    /**
     * Initializes the database service
     * Connects and verifies the connection to the database
     */
    async onModuleInit() {
        await this.$connect();
    }
}
