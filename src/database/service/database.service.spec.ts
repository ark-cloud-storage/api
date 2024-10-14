import { Test, TestingModule } from "@nestjs/testing";
import { DatabaseService } from "./database.service";
import { DatabaseModule } from "../database.module";

describe("DatabaseService", () => {
    let databaseService: DatabaseService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [DatabaseModule],
        }).compile();

        databaseService = module.get<DatabaseService>(DatabaseService);
    });

    it("should be defined", () => {
        expect(databaseService).toBeDefined();
    });
});
