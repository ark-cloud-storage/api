import { Test, TestingModule } from "@nestjs/testing";
import { InventoryService } from "./inventory.service";
import { AppModule } from "../../app.module";

describe("InventoryService", () => {
    let service: InventoryService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
