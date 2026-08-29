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
