import { ValidationPipe, BadRequestException } from "@nestjs/common";
import { DedicatedStorageDto } from "./dedicated-storage.dto";

describe("DedicatedStorageDto validation", () => {
    const pipe = new ValidationPipe({ whitelist: true });
    const meta = { type: "body", metatype: DedicatedStorageDto } as any;

    it("accepts a valid dedicated payload", async () => {
        await expect(
            pipe.transform(
                { type: "dedicated", ownerId: 1, resourceId: "res", amount: 5 },
                meta,
            ),
        ).resolves.toBeDefined();
    });

    it("rejects a non-integer amount", async () => {
        await expect(
            pipe.transform(
                {
                    type: "dedicated",
                    ownerId: 1,
                    resourceId: "res",
                    amount: "NaN",
                },
                meta,
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects an amount above the max", async () => {
        await expect(
            pipe.transform(
                {
                    type: "dedicated",
                    ownerId: 1,
                    resourceId: "res",
                    amount: 2_000_000_000,
                },
                meta,
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects an over-long resourceId", async () => {
        await expect(
            pipe.transform(
                {
                    type: "dedicated",
                    ownerId: 1,
                    resourceId: "a".repeat(501),
                    amount: 1,
                },
                meta,
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});
