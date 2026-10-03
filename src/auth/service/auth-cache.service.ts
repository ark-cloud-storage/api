import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AUTH_CACHE_SECONDS } from "../constants";

const DEFAULT_TTL_SECONDS = 300;

/**
 * Short-TTL in-memory cache of successful secret verifications, keyed by a
 * caller-supplied opaque key. Lets repeat auth from an already-verified
 * cluster skip the DB lookup and scrypt entirely. Single-instance in-memory,
 * matching the throttler's default store.
 */
@Injectable()
export class AuthCacheService {
    private readonly ttlMs: number;
    private readonly entries = new Map<string, number>();

    public constructor(private readonly configService: ConfigService) {
        const configured = Number(
            this.configService.get<string>(AUTH_CACHE_SECONDS),
        );
        const seconds =
            Number.isFinite(configured) && configured > 0
                ? configured
                : DEFAULT_TTL_SECONDS;
        this.ttlMs = seconds * 1000;
    }

    /**
     * Whether the key has a non-expired entry. Lazily evicts an expired one.
     */
    public isValid(key: string): boolean {
        const expiresAt = this.entries.get(key);
        if (expiresAt === undefined) {
            return false;
        }
        if (expiresAt <= Date.now()) {
            this.entries.delete(key);
            return false;
        }
        return true;
    }

    /**
     * Records a successful verification, valid for the configured TTL.
     */
    public set(key: string): void {
        this.entries.set(key, Date.now() + this.ttlMs);
    }
}
