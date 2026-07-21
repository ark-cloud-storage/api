import { randomBytes, scrypt, scryptSync, timingSafeEqual } from "crypto";
import { promisify } from "util";

const SCRYPT_PREFIX = "scrypt";
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

const scryptAsync = promisify(scrypt);

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
 * Parses a stored scrypt value into its salt and expected-key buffers.
 * Returns null for any value that is not a well-formed scrypt hash of the
 * expected key length (so callers reject it without running scrypt).
 */
function parseStored(
    stored: string,
): { salt: Buffer; expected: Buffer } | null {
    if (!isHashed(stored)) {
        return null;
    }
    const [, saltHex, keyHex] = stored.split("$");
    if (!saltHex || !keyHex) {
        return null;
    }
    const expected = Buffer.from(keyHex, "hex");
    if (expected.length !== KEY_LENGTH) {
        return null;
    }
    return { salt: Buffer.from(saltHex, "hex"), expected };
}

/**
 * Constant-time verification of a secret against a stored scrypt hash.
 * Returns false for any value that is not in scrypt format.
 */
export function verifySecret(plain: string, stored: string): boolean {
    const parsed = parseStored(stored);
    if (!parsed) {
        return false;
    }
    const actual = scryptSync(plain, parsed.salt, KEY_LENGTH);
    return timingSafeEqual(actual, parsed.expected);
}

/**
 * Constant-time verification of a secret against a stored scrypt hash,
 * running scrypt on the libuv threadpool so it does not block the event
 * loop. Returns false for any value that is not in scrypt format.
 */
export async function verifySecretAsync(
    plain: string,
    stored: string,
): Promise<boolean> {
    const parsed = parseStored(stored);
    if (!parsed) {
        return false;
    }
    const actual = (await scryptAsync(
        plain,
        parsed.salt,
        KEY_LENGTH,
    )) as Buffer;
    return timingSafeEqual(actual, parsed.expected);
}
