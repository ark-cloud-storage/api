import { AuthGuard } from "./auth.guard";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthModule } from "../auth.module";

describe("AuthGuard", () => {
    let authGuard: AuthGuard;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [AuthModule],
        }).compile();

        authGuard = module.get<AuthGuard>(AuthGuard);
    });

    it("should be defined", () => {
        expect(authGuard).toBeDefined();
    });
});
