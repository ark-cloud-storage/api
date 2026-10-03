import { InventoryGateway } from "./inventory.gateway";

function build(
    options: {
        login?: jest.Mock;
        isBlocked?: boolean;
        trustProxy?: boolean;
    } = {},
) {
    const login = options.login ?? jest.fn().mockResolvedValue("c1");
    const inventoryService = {} as any;
    const authService = { login };
    const throttlerStorage = {
        increment: jest.fn().mockResolvedValue({
            totalHits: 1,
            timeToExpire: 60,
            isBlocked: options.isBlocked ?? false,
            timeToBlockExpire: 0,
        }),
    };
    const configService = {
        get: jest.fn(() => (options.trustProxy ? "true" : "false")),
    };
    const gateway = new InventoryGateway(
        inventoryService,
        authService as any,
        throttlerStorage as any,
        configService as any,
    );
    return { gateway, authService, throttlerStorage };
}

function client(overrides: Record<string, any> = {}): any {
    return {
        upgradeHeaders: { "x-cluster-id": "c1", "x-cluster-secret": "s" },
        remoteAddress: "10.0.0.1",
        close: jest.fn(),
        terminate: jest.fn(),
        ...overrides,
    };
}

describe("InventoryGateway.handleConnection", () => {
    it("closes and terminates over-limit connections before authenticating", async () => {
        const { gateway, authService, throttlerStorage } = build({
            isBlocked: true,
        });
        const c = client();
        await gateway.handleConnection(c);
        expect(throttlerStorage.increment).toHaveBeenCalledTimes(1);
        expect(c.close).toHaveBeenCalledWith(1008, "Too Many Requests");
        expect(c.terminate).toHaveBeenCalledTimes(1);
        expect(authService.login).not.toHaveBeenCalled();
    });

    it("closes and terminates when credentials are missing", async () => {
        const { gateway } = build();
        const c = client({ upgradeHeaders: {} });
        await gateway.handleConnection(c);
        expect(c.close).toHaveBeenCalledWith(1008, "Unauthorized");
        expect(c.terminate).toHaveBeenCalledTimes(1);
    });

    it("closes and terminates when credentials are invalid", async () => {
        const { gateway } = build({
            login: jest.fn().mockRejectedValue(new Error("bad")),
        });
        const c = client({
            upgradeHeaders: { "x-cluster-id": "c1", "x-cluster-secret": "bad" },
        });
        await gateway.handleConnection(c);
        expect(c.close).toHaveBeenCalledWith(1008, "Unauthorized");
        expect(c.terminate).toHaveBeenCalledTimes(1);
    });

    it("keeps a valid client connected (no close/terminate)", async () => {
        const { gateway } = build({ login: jest.fn().mockResolvedValue("c1") });
        const c = client();
        await gateway.handleConnection(c);
        expect(c.close).not.toHaveBeenCalled();
        expect(c.terminate).not.toHaveBeenCalled();
    });

    it("keys the throttle on the rightmost XFF entry when trustProxy is on", async () => {
        const { gateway, throttlerStorage } = build({ trustProxy: true });
        const c = client({
            remoteAddress: "10.0.0.1",
            upgradeHeaders: {
                "x-cluster-id": "c1",
                "x-cluster-secret": "s",
                "x-forwarded-for": "1.2.3.4, 203.0.113.5",
            },
        });
        await gateway.handleConnection(c);
        expect(throttlerStorage.increment).toHaveBeenCalledWith(
            "ws-connect:203.0.113.5",
            expect.any(Number),
            expect.any(Number),
            expect.any(Number),
            "ws-connect",
        );
    });
});
