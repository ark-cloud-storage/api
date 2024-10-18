import { Test, TestingModule } from "@nestjs/testing";
import { InventoryController } from "./inventory.controller";
import { AppModule } from "../../app.module";

describe("InventoryController", () => {
    let controller: InventoryController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        controller = module.get<InventoryController>(InventoryController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
