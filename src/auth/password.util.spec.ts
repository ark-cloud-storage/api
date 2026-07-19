import { hashSecret, isHashed, verifySecret } from "./password.util";

describe("password.util", () => {
    it("hashes into the scrypt$salt$hash format", () => {
        const hash = hashSecret("s3cret");
        expect(hash.startsWith("scrypt$")).toBe(true);
        expect(hash.split("$")).toHaveLength(3);
    });

    it("produces a different hash each call (random salt)", () => {
        expect(hashSecret("s3cret")).not.toEqual(hashSecret("s3cret"));
    });

    it("verifies a correct secret", () => {
        expect(verifySecret("s3cret", hashSecret("s3cret"))).toBe(true);
    });

    it("rejects an incorrect secret", () => {
        expect(verifySecret("wrong", hashSecret("s3cret"))).toBe(false);
    });

    it("detects hashed vs plaintext values", () => {
        expect(isHashed(hashSecret("s3cret"))).toBe(true);
        expect(isHashed("plaintext-secret")).toBe(false);
    });

    it("treats a non-hashed stored value as invalid", () => {
        expect(verifySecret("plaintext-secret", "plaintext-secret")).toBe(
            false,
        );
    });
});
