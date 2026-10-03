import { resolveWsClientIp } from "./client-ip.util";

describe("resolveWsClientIp", () => {
    it("uses remoteAddress when trustProxy is off, even if XFF is present", () => {
        expect(resolveWsClientIp("10.0.0.1", "203.0.113.5", false)).toBe(
            "10.0.0.1",
        );
    });

    it("uses the sole XFF entry when trustProxy is on", () => {
        expect(resolveWsClientIp("10.0.0.1", "203.0.113.5", true)).toBe(
            "203.0.113.5",
        );
    });

    it("uses the rightmost XFF entry (unspoofable) when trustProxy is on", () => {
        expect(
            resolveWsClientIp("10.0.0.1", "1.2.3.4, 203.0.113.5", true),
        ).toBe("203.0.113.5");
    });

    it("falls back to remoteAddress when trustProxy is on but XFF is absent", () => {
        expect(resolveWsClientIp("10.0.0.1", undefined, true)).toBe("10.0.0.1");
    });

    it("returns 'unknown' when neither source is available", () => {
        expect(resolveWsClientIp(undefined, undefined, true)).toBe("unknown");
    });
});
