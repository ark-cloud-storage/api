import { InventoryGateway } from "./inventory.gateway";

function build(options: { login?: jest.Mock; isBlocked?: boolean } = {}) {
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
    const gateway = new InventoryGateway(
        inventoryService,
        authService as any,
        throttlerStorage as any,
    );
    return { gateway, authService, throttlerStorage };
}

describe("InventoryGateway.handleConnection", () => {
    it("closes over-limit connections before authenticating", async () => {
        const { gateway, authService, throttlerStorage } = build({
            isBlocked: true,
        });
        const client: any = {
            upgradeHeaders: { "x-cluster-id": "c1", "x-cluster-secret": "s" },
            remoteAddress: "1.2.3.4",
            close: jest.fn(),
        };

        await gateway.handleConnection(client);

        expect(throttlerStorage.increment).toHaveBeenCalledTimes(1);
        expect(client.close).toHaveBeenCalledWith(1008, "Too Many Requests");
        expect(authService.login).not.toHaveBeenCalled();
    });

    it("closes the socket when credentials are missing", async () => {
        const { gateway } = build();
        const client: any = {
            upgradeHeaders: {},
            remoteAddress: "1.2.3.4",
            close: jest.fn(),
        };
        await gateway.handleConnection(client);
        expect(client.close).toHaveBeenCalledWith(1008, "Unauthorized");
    });

    it("closes the socket when credentials are invalid", async () => {
        const { gateway } = build({
            login: jest.fn().mockRejectedValue(new Error("bad")),
        });
        const client: any = {
            upgradeHeaders: { "x-cluster-id": "c1", "x-cluster-secret": "bad" },
            remoteAddress: "1.2.3.4",
            close: jest.fn(),
        };
        await gateway.handleConnection(client);
        expect(client.close).toHaveBeenCalledWith(1008, "Unauthorized");
    });

    it("keeps a valid client connected", async () => {
        const { gateway } = build({ login: jest.fn().mockResolvedValue("c1") });
        const client: any = {
            upgradeHeaders: { "x-cluster-id": "c1", "x-cluster-secret": "s" },
            remoteAddress: "1.2.3.4",
            close: jest.fn(),
        };
        await gateway.handleConnection(client);
        expect(client.close).not.toHaveBeenCalled();
    });
});
