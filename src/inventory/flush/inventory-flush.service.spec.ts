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
