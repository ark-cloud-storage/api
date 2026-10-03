import { Logger } from "@nestjs/common";
import { InventoryStore } from "./inventory.store";
import { DatabaseService } from "../../database/service/database.service";

describe("InventoryStore — hydration & reads", () => {
    it("hydrates a cluster from the database once", async () => {
        const findMany = jest
            .fn()
            .mockResolvedValue([
                { clusterId: "c1", ownerId: 1, resourceId: "wood", amount: 10 },
            ]);
        const db = {
            dedicatedStorage: { findMany },
        } as unknown as DatabaseService;
        const store = new InventoryStore(db);

        await store.ensureLoaded("c1");
        await store.ensureLoaded("c1");

        expect(findMany).toHaveBeenCalledTimes(1);
        expect(store.getClusterInventory("c1")).toEqual([
            expect.objectContaining({
                ownerId: 1,
                resourceId: "wood",
                amount: 10,
                type: "dedicated",
            }),
        ]);
    });

    it("loads concurrently-requested clusters only once", async () => {
        let resolve!: (value: unknown) => void;
        const findMany = jest
            .fn()
            .mockReturnValue(new Promise((r) => (resolve = r)));
        const db = {
            dedicatedStorage: { findMany },
        } as unknown as DatabaseService;
        const store = new InventoryStore(db);

        const a = store.ensureLoaded("c1");
        const b = store.ensureLoaded("c1");
        resolve([]);
        await Promise.all([a, b]);

        expect(findMany).toHaveBeenCalledTimes(1);
    });

    it("returns an empty inventory for an unknown cluster", () => {
        const db = {
            dedicatedStorage: { findMany: jest.fn() },
        } as unknown as DatabaseService;

        expect(new InventoryStore(db).getClusterInventory("nope")).toEqual([]);
    });
});

describe("InventoryStore — mutation & dirty tracking", () => {
    const emptyDb = () =>
        ({
            dedicatedStorage: { findMany: jest.fn().mockResolvedValue([]) },
        }) as unknown as DatabaseService;

    it("accumulates deltas and returns the running total", async () => {
        const store = new InventoryStore(emptyDb());
        await store.ensureLoaded("c1");

        expect(store.applyDelta("c1", 1, "wood", 5)).toBe(5);
        expect(store.applyDelta("c1", 1, "wood", 7)).toBe(12);
        expect(store.applyDelta("c1", 1, "wood", -2)).toBe(10);
    });

    it("clamps totals to the 32-bit signed integer range", async () => {
        const warnSpy = jest
            .spyOn(Logger.prototype, "warn")
            .mockImplementation(() => undefined);
        try {
            const store = new InventoryStore(emptyDb());
            await store.ensureLoaded("c1");

            store.applyDelta("c1", 1, "wood", 2_000_000_000);
            expect(store.applyDelta("c1", 1, "wood", 2_000_000_000)).toBe(
                2_147_483_647,
            );
        } finally {
            warnSpy.mockRestore();
        }
    });

    it("marks changed entries dirty and exposes them via snapshot", async () => {
        const store = new InventoryStore(emptyDb());
        await store.ensureLoaded("c1");

        store.applyDelta("c1", 1, "wood", 5);

        expect(store.takeDirtySnapshot()).toEqual([
            {
                clusterId: "c1",
                ownerId: 1,
                resourceId: "wood",
                value: 5,
                version: 1,
            },
        ]);
    });

    it("clearDirty only clears entries whose version is unchanged", async () => {
        const store = new InventoryStore(emptyDb());
        await store.ensureLoaded("c1");

        store.applyDelta("c1", 1, "wood", 5); // version 1
        const refs = store.takeDirtySnapshot(); // captured at version 1
        store.applyDelta("c1", 1, "wood", 3); // version 2 (changed mid-flush)

        store.clearDirty(refs); // must NOT clear: version moved on
        expect(store.takeDirtySnapshot()).toHaveLength(1);

        store.clearDirty(store.takeDirtySnapshot()); // now versions match
        expect(store.takeDirtySnapshot()).toHaveLength(0);
    });

    it("honours the maxBatch limit", async () => {
        const store = new InventoryStore(emptyDb());
        await store.ensureLoaded("c1");
        store.applyDelta("c1", 1, "wood", 1);
        store.applyDelta("c1", 1, "stone", 1);
        store.applyDelta("c1", 1, "metal", 1);

        expect(store.takeDirtySnapshot(2)).toHaveLength(2);
    });
});
