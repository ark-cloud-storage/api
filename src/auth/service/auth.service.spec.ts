import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { AuthModule } from "../auth.module";

describe("AuthService", () => {
    let authService: AuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [AuthModule],
        }).compile();

        authService = module.get<AuthService>(AuthService);
    });

    it("should be defined", () => {
        expect(authService).toBeDefined();
    });
});
