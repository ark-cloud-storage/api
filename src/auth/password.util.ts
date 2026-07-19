import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCRYPT_PREFIX = "scrypt";
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

/**
 * Hashes a secret with scrypt and a random salt.
 * @param plain The plaintext secret
 * @returns A value of the form `scrypt$<saltHex>$<hashHex>`
 */
export function hashSecret(plain: string): string {
    const salt = randomBytes(SALT_BYTES);
    const key = scryptSync(plain, salt, KEY_LENGTH);
    return `${SCRYPT_PREFIX}$${salt.toString("hex")}$${key.toString("hex")}`;
}

/**
 * Whether a stored value is already a scrypt hash.
 */
export function isHashed(stored: string): boolean {
    return stored.startsWith(`${SCRYPT_PREFIX}$`);
}

/**
 * Constant-time verification of a secret against a stored scrypt hash.
 * Returns false for any value that is not in scrypt format.
 */
export function verifySecret(plain: string, stored: string): boolean {
    if (!isHashed(stored)) {
        return false;
    }
    const [, saltHex, keyHex] = stored.split("$");
    if (!saltHex || !keyHex) {
        return false;
    }
    const expected = Buffer.from(keyHex, "hex");
    if (expected.length !== KEY_LENGTH) {
        return false;
    }
    const actual = scryptSync(plain, Buffer.from(saltHex, "hex"), KEY_LENGTH);
    return timingSafeEqual(actual, expected);
}
