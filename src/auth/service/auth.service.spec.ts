import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { hashSecret } from "../password.util";
import { ALLOW_REGISTRATION, REGISTER_CLUSTERS } from "../constants";

function buildService(configValues: Record<string, unknown> = {}) {
    const db = {
        cluster: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            upsert: jest.fn(),
        },
    };
    const config = { get: jest.fn((key: string) => configValues[key]) };
    const cache = { isValid: jest.fn().mockReturnValue(false), set: jest.fn() };
    const service = new AuthService(db as any, config as any, cache as any);
    return { service, db, config, cache };
}

describe("AuthService", () => {
    it("stores a hashed secret on register and returns the plaintext once", async () => {
        const { service, db } = buildService({ [ALLOW_REGISTRATION]: "true" });
        db.cluster.findUnique.mockResolvedValue(null);
        db.cluster.create.mockImplementation(async ({ data }: any) => data);

        const dto = await service.register("cluster-1");

        const stored = db.cluster.create.mock.calls[0][0].data.secret;
        expect(stored.startsWith("scrypt$")).toBe(true);
        expect(dto.secret).not.toEqual(stored);
        expect(dto.secret.startsWith("scrypt$")).toBe(false);
    });

    it("logs in with a correct secret, verifies, and caches", async () => {
        const { service, db, cache } = buildService();
        db.cluster.findUnique.mockResolvedValue({
            id: "cluster-1",
            secret: hashSecret("good-secret"),
        });

        await expect(service.login("cluster-1", "good-secret")).resolves.toBe(
            "cluster-1",
        );
        expect(cache.set).toHaveBeenCalledTimes(1);
    });

    it("skips the DB and verification on a cache hit", async () => {
        const { service, db, cache } = buildService();
        cache.isValid.mockReturnValue(true);

        await expect(service.login("cluster-1", "anything")).resolves.toBe(
            "cluster-1",
        );
        expect(db.cluster.findUnique).not.toHaveBeenCalled();
    });

    it("does not cache a wrong secret", async () => {
        const { service, db, cache } = buildService();
        db.cluster.findUnique.mockResolvedValue({
            id: "cluster-1",
            secret: hashSecret("good-secret"),
        });

        await expect(
            service.login("cluster-1", "bad-secret"),
        ).rejects.toBeInstanceOf(UnauthorizedException);
        expect(cache.set).not.toHaveBeenCalled();
    });

    it("rejects an unknown cluster", async () => {
        const { service, db } = buildService();
        db.cluster.findUnique.mockResolvedValue(null);

        await expect(service.login("nope", "x")).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
    });

    it("hashes secrets when seeding clusters from configuration", async () => {
        const { service, db } = buildService({
            [REGISTER_CLUSTERS]: "cluster-1:seed-secret",
        });
        db.cluster.findUnique.mockResolvedValue(null);

        await service.onModuleInit();

        const upsertArg = db.cluster.upsert.mock.calls[0][0];
        expect(upsertArg.create.secret.startsWith("scrypt$")).toBe(true);
        expect(upsertArg.update.secret.startsWith("scrypt$")).toBe(true);
    });
});
