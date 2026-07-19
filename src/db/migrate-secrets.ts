import { PrismaClient } from "@prisma/client";
import { hashSecret, isHashed } from "../auth/password.util";

type ClusterBackfillClient = {
    cluster: {
        findMany: () => Promise<{ id: string; secret: string }[]>;
        update: (args: {
            where: { id: string };
            data: { secret: string };
        }) => Promise<unknown>;
    };
};

/**
 * Hashes every cluster secret that is not already a scrypt hash.
 * @returns The number of rows converted.
 */
export async function hashPlaintextSecrets(
    prisma: ClusterBackfillClient,
): Promise<number> {
    const clusters = await prisma.cluster.findMany();
    let converted = 0;
    for (const cluster of clusters) {
        if (isHashed(cluster.secret)) {
            continue;
        }
        await prisma.cluster.update({
            where: { id: cluster.id },
            data: { secret: hashSecret(cluster.secret) },
        });
        converted++;
    }
    return converted;
}

async function main(): Promise<void> {
    const prisma = new PrismaClient();
    try {
        const converted = await hashPlaintextSecrets(prisma);
        console.log(`Hashed ${converted} plaintext cluster secret(s)`);
    } finally {
        await prisma.$disconnect();
    }
}

// Only run when invoked directly (e.g. `node dist/db/migrate-secrets.js`),
// not when imported by tests.
if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
