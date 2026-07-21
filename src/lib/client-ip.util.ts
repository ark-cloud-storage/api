/**
 * Resolves the client IP for a WebSocket connection.
 *
 * When `trustProxy` is true (the API runs behind exactly one trusted reverse
 * proxy), the real client is the RIGHTMOST X-Forwarded-For entry — the value
 * the trusted proxy appended based on the TCP peer it actually saw. Entries to
 * its left are client-supplied and must never be trusted. When `trustProxy` is
 * false, or no forwarded header is present, the direct socket address is used.
 *
 * @param remoteAddress The direct socket remote address
 * @param forwardedFor The raw X-Forwarded-For header value, if any
 * @param trustProxy Whether the API is behind a trusted single-hop proxy
 * @returns The client IP, or "unknown" when no source is available
 */
export function resolveWsClientIp(
    remoteAddress: string | undefined,
    forwardedFor: string | undefined,
    trustProxy: boolean,
): string {
    if (trustProxy && forwardedFor) {
        const parts = forwardedFor
            .split(",")
            .map((part) => part.trim())
            .filter((part) => part.length > 0);
        if (parts.length > 0) {
            return parts[parts.length - 1];
        }
    }
    return remoteAddress ?? "unknown";
}
