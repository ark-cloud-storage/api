import { AuthController } from "./auth.controller";
import { ClusterDto } from "../dto/cluster.dto";

describe("AuthController", () => {
    function build() {
        const authService = {
            login: jest.fn(),
            register: jest.fn(),
        };
        return {
            controller: new AuthController(authService as any),
            authService,
        };
    }

    it("returns only the id on login, never the secret", async () => {
        const { controller, authService } = build();
        authService.login.mockResolvedValue("cluster-1");

        const result = await controller.login({ id: "cluster-1", secret: "s" });

        expect(result).toEqual({ id: "cluster-1" });
        expect("secret" in result).toBe(false);
    });

    it("returns the generated secret on register", async () => {
        const { controller, authService } = build();
        authService.register.mockResolvedValue(
            new ClusterDto("cluster-1", "plaintext"),
        );

        const result = await controller.register({ id: "cluster-1" });

        expect(result.secret).toBe("plaintext");
    });
});
