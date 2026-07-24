import { WebSocket } from "ws";

export interface ModSocket {
    send(payload: unknown): void;
    nextMessage(timeoutMs?: number): Promise<any>;
    expectNoMessage(windowMs?: number): Promise<void>;
    close(): void;
}

/**
 * Opens a real ws connection to the inventory gateway, mirroring the mod:
 * the cluster credentials travel as upgrade headers. Resolves once the socket
 * is open. Buffers server frames so tests can await them one at a time.
 */
export function connectMod(
    port: number,
    headers: Record<string, string>,
): Promise<ModSocket> {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/inventory`, { headers });
    const queue: any[] = [];
    let waiter: ((msg: any) => void) | null = null;

    ws.on("message", (raw: Buffer) => {
        const msg = JSON.parse(raw.toString());
        if (waiter) {
            const resolve = waiter;
            waiter = null;
            resolve(msg);
        } else {
            queue.push(msg);
        }
    });

    const socket: ModSocket = {
        send: (payload) => ws.send(JSON.stringify(payload)),
        nextMessage: (timeoutMs = 1000) =>
            new Promise((resolve, reject) => {
                if (queue.length) return resolve(queue.shift());
                const timer = setTimeout(() => {
                    waiter = null;
                    reject(new Error("Timed out waiting for a WS message"));
                }, timeoutMs);
                waiter = (msg) => {
                    clearTimeout(timer);
                    resolve(msg);
                };
            }),
        expectNoMessage: (windowMs = 300) =>
            new Promise((resolve, reject) => {
                if (queue.length) {
                    return reject(
                        new Error(
                            `Unexpected WS message: ${JSON.stringify(queue[0])}`,
                        ),
                    );
                }
                const timer = setTimeout(() => {
                    waiter = null;
                    resolve();
                }, windowMs);
                waiter = (msg) => {
                    clearTimeout(timer);
                    reject(
                        new Error(
                            `Unexpected WS message: ${JSON.stringify(msg)}`,
                        ),
                    );
                };
            }),
        close: () => ws.close(),
    };

    return new Promise((resolve, reject) => {
        ws.on("open", () => resolve(socket));
        ws.on("error", reject);
    });
}
