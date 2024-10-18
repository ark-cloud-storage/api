import { Test, TestingModule } from "@nestjs/testing";
import { InventoryModule } from "./inventory.module";
import { AppModule } from "../app.module";

describe("InventoryModule", () => {
    let inventoryModule: InventoryModule;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        inventoryModule = module.get<InventoryModule>(InventoryModule);
    });

    it("should be defined", () => {
        expect(inventoryModule).toBeDefined();
    });
});
