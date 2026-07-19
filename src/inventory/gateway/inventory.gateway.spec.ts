import { InventoryGateway } from "./inventory.gateway";

describe("InventoryGateway.handleConnection", () => {
    function build(login: any = jest.fn()) {
        const inventoryService = {} as any;
        const authService = { login };
        return {
            gateway: new InventoryGateway(inventoryService, authService as any),
            authService,
        };
    }

    it("closes the socket when credentials are missing", async () => {
        const { gateway } = build();
        const client: any = { upgradeHeaders: {}, close: jest.fn() };
        await gateway.handleConnection(client);
        expect(client.close).toHaveBeenCalledWith(1008, "Unauthorized");
    });

    it("closes the socket when credentials are invalid", async () => {
        const { gateway } = build(
            jest.fn().mockRejectedValue(new Error("bad")),
        );
        const client: any = {
            upgradeHeaders: { "x-cluster-id": "c1", "x-cluster-secret": "bad" },
            close: jest.fn(),
        };
        await gateway.handleConnection(client);
        expect(client.close).toHaveBeenCalledWith(1008, "Unauthorized");
    });

    it("keeps a valid client connected", async () => {
        const { gateway } = build(jest.fn().mockResolvedValue("c1"));
        const client: any = {
            upgradeHeaders: { "x-cluster-id": "c1", "x-cluster-secret": "s" },
            close: jest.fn(),
        };
        await gateway.handleConnection(client);
        expect(client.close).not.toHaveBeenCalled();
    });
});
