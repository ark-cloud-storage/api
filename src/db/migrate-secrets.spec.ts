import { hashPlaintextSecrets } from "./migrate-secrets";
import { hashSecret, isHashed } from "../auth/password.util";

function mockPrisma(rows: { id: string; secret: string }[]) {
    const store = new Map(rows.map((r) => [r.id, { ...r }]));
    return {
        cluster: {
            findMany: jest.fn(async () => Array.from(store.values())),
            update: jest.fn(async ({ where, data }: any) => {
                store.get(where.id)!.secret = data.secret;
            }),
        },
        store,
    };
}

describe("hashPlaintextSecrets", () => {
    it("hashes plaintext rows and leaves hashed rows untouched", async () => {
        const prisma = mockPrisma([
            { id: "a", secret: "plaintext-a" },
            { id: "b", secret: hashSecret("already-b") },
        ]);

        const converted = await hashPlaintextSecrets(prisma as any);

        expect(converted).toBe(1);
        expect(prisma.cluster.update).toHaveBeenCalledTimes(1);
        expect(isHashed(prisma.store.get("a")!.secret)).toBe(true);
    });

    it("is idempotent when all rows are already hashed", async () => {
        const prisma = mockPrisma([{ id: "a", secret: hashSecret("a") }]);
        const converted = await hashPlaintextSecrets(prisma as any);
        expect(converted).toBe(0);
        expect(prisma.cluster.update).not.toHaveBeenCalled();
    });
});
