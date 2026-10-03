import { InventoryFlushService } from "./inventory-flush.service";
import { InventoryStore } from "../store/inventory.store";
import { DatabaseService } from "../../database/service/database.service";
import { ConfigService } from "@nestjs/config";

const config = {
    get: jest.fn().mockReturnValue(undefined),
} as unknown as ConfigService;

describe("Inventory write-behind (store + flush)", () => {
    it("coalesces repeated same-key updates into one upsert", async () => {
        const upsert = jest.fn(() => ({}));
        const db = {
            dedicatedStorage: {
                findMany: jest.fn().mockResolvedValue([]),
                upsert,
            },
            $transaction: jest.fn().mockResolvedValue([]),
        } as unknown as DatabaseService;
        const store = new InventoryStore(db);
        const flush = new InventoryFlushService(store, db, config);

        await store.ensureLoaded("c1");
        store.applyDelta("c1", 1, "wood", 5);
        store.applyDelta("c1", 1, "wood", 7);
        store.applyDelta("c1", 1, "wood", -2);

        await flush.flush();

        expect(db.$transaction).toHaveBeenCalledTimes(1);
        expect(upsert).toHaveBeenCalledTimes(1);
        expect(upsert).toHaveBeenCalledWith(
            expect.objectContaining({ update: { amount: 10 } }),
        );
    });

    it("keeps a key dirty when it changes during a flush", async () => {
        const upsert = jest.fn(() => ({}));
        let resolveTx!: (value: unknown) => void;
        const db = {
            dedicatedStorage: {
                findMany: jest.fn().mockResolvedValue([]),
                upsert,
            },
            $transaction: jest.fn(
                () => new Promise((resolve) => (resolveTx = resolve)),
            ),
        } as unknown as DatabaseService;
        const store = new InventoryStore(db);
        const flush = new InventoryFlushService(store, db, config);

        await store.ensureLoaded("c1");
        store.applyDelta("c1", 1, "wood", 5); // version 1, value 5

        const flushing = flush.flush(); // snapshots version 1, awaits tx
        store.applyDelta("c1", 1, "wood", 3); // version 2, value 8 (mid-flush)
        resolveTx([]); // tx resolves
        await flushing;

        const refs = store.takeDirtySnapshot();
        expect(refs).toHaveLength(1);
        expect(refs[0].value).toBe(8);
    });
});
