import { clusterIdFactory } from "./cluster-id.decorator";

describe("clusterIdFactory", () => {
    it("reads clusterId from the http request", () => {
        const ctx: any = {
            getType: () => "http",
            switchToHttp: () => ({
                getRequest: () => ({ clusterId: "cluster-1" }),
            }),
        };
        expect(clusterIdFactory(undefined, ctx)).toBe("cluster-1");
    });

    it("reads clusterId from the ws client", () => {
        const ctx: any = {
            getType: () => "ws",
            switchToWs: () => ({
                getClient: () => ({ clusterId: "cluster-2" }),
            }),
        };
        expect(clusterIdFactory(undefined, ctx)).toBe("cluster-2");
    });
});
