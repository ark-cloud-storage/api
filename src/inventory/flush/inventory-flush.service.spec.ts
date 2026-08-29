import { InventoryFlushService } from "./inventory-flush.service";
import { InventoryStore, DirtyRef } from "../store/inventory.store";
import { DatabaseService } from "../../database/service/database.service";
import { ConfigService } from "@nestjs/config";

const config = {
    get: jest.fn().mockReturnValue(undefined),
} as unknown as ConfigService;

describe("InventoryFlushService — flush()", () => {
    it("writes dirty entries in a single transaction and clears them", async () => {
        const upsert = jest.fn(() => ({}));
        const $transaction = jest.fn().mockResolvedValue([]);
        const db = {
            dedicatedStorage: { upsert },
            $transaction,
        } as unknown as DatabaseService;
        const refs: DirtyRef[] = [
            {
                clusterId: "c1",
                ownerId: 1,
                resourceId: "wood",
                value: 10,
                version: 1,
            },
        ];
        const store = {
            takeDirtySnapshot: jest.fn().mockReturnValue(refs),
            clearDirty: jest.fn(),
        } as unknown as InventoryStore;

        const flush = new InventoryFlushService(store, db, config);
        await flush.flush();

        expect($transaction).toHaveBeenCalledTimes(1);
        expect(upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    clusterId_ownerId_resourceId: {
                        clusterId: "c1",
                        ownerId: 1,
                        resourceId: "wood",
                    },
                },
                create: {
                    clusterId: "c1",
                    ownerId: 1,
                    resourceId: "wood",
                    amount: 10,
                },
                update: { amount: 10 },
            }),
        );
        expect(store.clearDirty).toHaveBeenCalledWith(refs);
    });

    it("does nothing when there is nothing dirty", async () => {
        const $transaction = jest.fn();
        const db = {
            dedicatedStorage: { upsert: jest.fn() },
            $transaction,
        } as unknown as DatabaseService;
        const store = {
            takeDirtySnapshot: jest.fn().mockReturnValue([]),
            clearDirty: jest.fn(),
        } as unknown as InventoryStore;

        await new InventoryFlushService(store, db, config).flush();

        expect($transaction).not.toHaveBeenCalled();
    });

    it("propagates the error and keeps entries dirty when the transaction fails", async () => {
        const $transaction = jest.fn().mockRejectedValue(new Error("db down"));
        const db = {
            dedicatedStorage: { upsert: jest.fn(() => ({})) },
            $transaction,
        } as unknown as DatabaseService;
        const store = {
            takeDirtySnapshot: jest.fn().mockReturnValue([
                {
                    clusterId: "c1",
                    ownerId: 1,
                    resourceId: "wood",
                    value: 10,
                    version: 1,
                },
            ]),
            clearDirty: jest.fn(),
        } as unknown as InventoryStore;

        const flush = new InventoryFlushService(store, db, config);

        await expect(flush.flush()).rejects.toThrow("db down");
        expect(store.clearDirty).not.toHaveBeenCalled();
    });
});

describe("InventoryFlushService — lifecycle & backoff", () => {
    const makeService = () => {
        const db = {
            dedicatedStorage: { upsert: jest.fn() },
            $transaction: jest.fn(),
        } as unknown as DatabaseService;
        const store = {
            takeDirtySnapshot: jest.fn().mockReturnValue([]),
            clearDirty: jest.fn(),
        } as unknown as InventoryStore;
        return new InventoryFlushService(store, db, config);
    };

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("flushes on the configured interval", async () => {
        const service = makeService();
        const flushSpy = jest.spyOn(service, "flush").mockResolvedValue();

        service.onApplicationBootstrap();
        await jest.advanceTimersByTimeAsync(500);

        expect(flushSpy).toHaveBeenCalledTimes(1);
        await service.onModuleDestroy();
    });

    it("grows the backoff on repeated failures", async () => {
        const service = makeService();
        const flushSpy = jest
            .spyOn(service, "flush")
            .mockRejectedValue(new Error("db down"));

        service.onApplicationBootstrap();
        await jest.advanceTimersByTimeAsync(500); // tick 1 -> backoff 500
        await jest.advanceTimersByTimeAsync(500); // tick 2 -> backoff 1000
        await jest.advanceTimersByTimeAsync(1000); // tick 3

        expect(flushSpy).toHaveBeenCalledTimes(3);
        await service.onModuleDestroy();
    });

    it("stops the loop and runs a final flush on destroy", async () => {
        const service = makeService();
        const flushSpy = jest.spyOn(service, "flush").mockResolvedValue();

        service.onApplicationBootstrap();
        await service.onModuleDestroy();
        expect(flushSpy).toHaveBeenCalledTimes(1);

        await jest.advanceTimersByTimeAsync(5000);
        expect(flushSpy).toHaveBeenCalledTimes(1); // no further ticks
    });
});
