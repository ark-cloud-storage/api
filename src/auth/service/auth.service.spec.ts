import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { AppModule } from "../../app.module";

describe("AuthService", () => {
    let authService: AuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        authService = module.get<AuthService>(AuthService);
    });

    it("should be defined", () => {
        expect(authService).toBeDefined();
    });
});
