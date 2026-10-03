import { AuthCacheService } from "./auth-cache.service";

function buildCache(seconds: number): AuthCacheService {
    const config = { get: jest.fn(() => String(seconds)) };
    return new AuthCacheService(config as any);
}

describe("AuthCacheService", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("is invalid for a key that was never set", () => {
        const cache = buildCache(300);
        expect(cache.isValid("k")).toBe(false);
    });

    it("is valid immediately after set", () => {
        const cache = buildCache(300);
        cache.set("k");
        expect(cache.isValid("k")).toBe(true);
    });

    it("expires after the TTL elapses", () => {
        const cache = buildCache(300);
        cache.set("k");
        jest.advanceTimersByTime(300_000 + 1);
        expect(cache.isValid("k")).toBe(false);
    });

    it("defaults to a 300s TTL when config is unset", () => {
        const config = { get: jest.fn(() => undefined) };
        const cache = new AuthCacheService(config as any);
        cache.set("k");
        jest.advanceTimersByTime(299_000);
        expect(cache.isValid("k")).toBe(true);
        jest.advanceTimersByTime(2_000);
        expect(cache.isValid("k")).toBe(false);
    });
});
