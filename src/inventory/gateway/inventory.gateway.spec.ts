import { Test, TestingModule } from "@nestjs/testing";
import { InventoryGateway } from "./inventory.gateway";
import { AppModule } from "../../app.module";

describe("InventoryGateway", () => {
    let gateway: InventoryGateway;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        gateway = module.get<InventoryGateway>(InventoryGateway);
    });

    it("should be defined", () => {
        expect(gateway).toBeDefined();
    });
});
