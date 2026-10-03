import { UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";

function httpContext(headers: Record<string, string>, req: any = {}) {
    req.headers = headers;
    return {
        getType: () => "http",
        getHandler: () => () => undefined,
        getClass: () => class {},
        switchToHttp: () => ({ getRequest: () => req }),
    } as any;
}

function build(loginImpl: any = jest.fn().mockResolvedValue("cluster-1")) {
    const authService = { login: loginImpl };
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    return {
        guard: new AuthGuard(authService as any, reflector as any),
        authService,
        reflector,
    };
}

describe("AuthGuard", () => {
    it("attaches the cluster id to the request", async () => {
        const { guard } = build();
        const req: any = {};
        await guard.canActivate(
            httpContext(
                { "x-cluster-id": "cluster-1", "x-cluster-secret": "s" },
                req,
            ),
        );
        expect(req.clusterId).toBe("cluster-1");
    });

    it("keeps concurrent requests isolated (no cross-tenant leak)", async () => {
        const login = jest.fn((id: string) => Promise.resolve(id));
        const { guard } = build(login);
        const reqA: any = {};
        const reqB: any = {};

        await Promise.all([
            guard.canActivate(
                httpContext(
                    { "x-cluster-id": "A", "x-cluster-secret": "s" },
                    reqA,
                ),
            ),
            guard.canActivate(
                httpContext(
                    { "x-cluster-id": "B", "x-cluster-secret": "s" },
                    reqB,
                ),
            ),
        ]);

        expect(reqA.clusterId).toBe("A");
        expect(reqB.clusterId).toBe("B");
    });

    it("allows unauthenticated handlers through", async () => {
        const { guard, reflector, authService } = build();
        reflector.getAllAndOverride.mockReturnValue(true);
        const result = await guard.canActivate(httpContext({}, {}));
        expect(result).toBe(true);
        expect(authService.login).not.toHaveBeenCalled();
    });

    it("rejects requests missing credentials", async () => {
        const { guard } = build();
        await expect(
            guard.canActivate(httpContext({}, {})),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });
});
