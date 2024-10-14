import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthModule } from "../auth.module";

describe("AuthController", () => {
    let authController: AuthController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [AuthModule],
        }).compile();

        authController = module.get<AuthController>(AuthController);
    });

    it("should be defined", () => {
        expect(authController).toBeDefined();
    });
});
