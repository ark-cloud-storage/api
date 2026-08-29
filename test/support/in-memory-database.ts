interface ClusterRow {
    id: string;
    secret: string;
}

interface StorageRow {
    clusterId: string;
    ownerId: number;
    resourceId: string;
    amount: number;
}

/**
 * A minimal in-memory stand-in for DatabaseService (Prisma). It mimics only the
 * calls the app makes and persists writes verbatim, so auth works on both
 * branches (main stores plaintext secrets, security-hardening stores scrypt
 * hashes — the fake does not care).
 */
export function createInMemoryDatabase() {
    const clusters = new Map<string, ClusterRow>();
    const storage = new Map<string, StorageRow>();
    const storageKey = (
        clusterId: string,
        ownerId: number,
        resourceId: string,
    ) => `${clusterId} ${ownerId} ${resourceId}`;

    return {
        cluster: {
            async findUnique({ where }: { where: { id: string } }) {
                return clusters.get(where.id) ?? null;
            },
            async findFirst({ where }: { where: { id: string } }) {
                return clusters.get(where.id) ?? null;
            },
            async create({ data }: { data: ClusterRow }) {
                const row: ClusterRow = { id: data.id, secret: data.secret };
                clusters.set(row.id, row);
                return row;
            },
            async upsert({
                where,
                create,
                update,
            }: {
                where: { id: string };
                create: ClusterRow;
                update: Partial<ClusterRow>;
            }) {
                const existing = clusters.get(where.id);
                const row: ClusterRow = existing
                    ? { ...existing, ...update }
                    : { id: create.id, secret: create.secret };
                clusters.set(where.id, row);
                return row;
            },
        },
        dedicatedStorage: {
            async findMany({ where }: { where: { clusterId: string } }) {
                return [...storage.values()].filter(
                    (row) => row.clusterId === where.clusterId,
                );
            },
            async upsert({
                where,
                create,
                update,
            }: {
                where: {
                    clusterId_ownerId_resourceId: {
                        clusterId: string;
                        ownerId: number;
                        resourceId: string;
                    };
                };
                create: StorageRow;
                update: { amount: number };
            }) {
                const { clusterId, ownerId, resourceId } =
                    where.clusterId_ownerId_resourceId;
                const key = storageKey(clusterId, ownerId, resourceId);
                const existing = storage.get(key);
                const row: StorageRow = existing
                    ? { ...existing, amount: update.amount }
                    : {
                          clusterId: create.clusterId,
                          ownerId: create.ownerId,
                          resourceId: create.resourceId,
                          amount: create.amount,
                      };
                storage.set(key, row);
                return row;
            },
        },
        async $transaction(operations: Promise<unknown>[]) {
            return Promise.all(operations);
        },
    };
}
