import { Test, TestingModule } from "@nestjs/testing";
import { DatabaseService } from "./database.service";
import { AppModule } from "../../app.module";

describe("DatabaseService", () => {
    let databaseService: DatabaseService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        databaseService = module.get<DatabaseService>(DatabaseService);
    });

    it("should be defined", () => {
        expect(databaseService).toBeDefined();
    });
});
