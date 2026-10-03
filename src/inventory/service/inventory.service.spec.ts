import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InventoryService } from "./inventory.service";
import { AppModule } from "../../app.module";
import { InventoryStore } from "../store/inventory.store";
import { DedicatedStorageDto } from "../dto/dedicated-storage.dto";

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

describe("InventoryService (unit)", () => {
    it("applies the delta and emits the new total without a DB write", async () => {
        const store = {
            ensureLoaded: jest.fn().mockResolvedValue(undefined),
            applyDelta: jest.fn().mockReturnValue(42),
        } as unknown as InventoryStore;
        const emitter = { emit: jest.fn() } as unknown as EventEmitter2;
        const service = new InventoryService(store, emitter);

        await service.updateInventory(
            "c1",
            new DedicatedStorageDto(1, "wood", 5),
        );

        expect(store.ensureLoaded).toHaveBeenCalledWith("c1");
        expect(store.applyDelta).toHaveBeenCalledWith("c1", 1, "wood", 5);
        expect(emitter.emit).toHaveBeenCalledWith(
            "inventory.updated",
            "c1",
            expect.objectContaining({
                type: "dedicated",
                ownerId: 1,
                resourceId: "wood",
                amount: 42,
            }),
        );
    });

    it("serves inventory from the store after hydrating", async () => {
        const inventory = [new DedicatedStorageDto(1, "wood", 10)];
        const store = {
            ensureLoaded: jest.fn().mockResolvedValue(undefined),
            getClusterInventory: jest.fn().mockReturnValue(inventory),
        } as unknown as InventoryStore;
        const service = new InventoryService(store, {
            emit: jest.fn(),
        } as unknown as EventEmitter2);

        const result = await service.getInventory("c1");

        expect(store.ensureLoaded).toHaveBeenCalledWith("c1");
        expect(result).toBe(inventory);
    });

    it("rejects unknown storage types without touching the store", async () => {
        const store = {
            ensureLoaded: jest.fn(),
            applyDelta: jest.fn(),
        } as unknown as InventoryStore;
        const service = new InventoryService(store, {
            emit: jest.fn(),
        } as unknown as EventEmitter2);

        await expect(
            service.updateInventory("c1", {
                type: "bogus",
                ownerId: 1,
            } as never),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(store.ensureLoaded).not.toHaveBeenCalled();
    });
});
