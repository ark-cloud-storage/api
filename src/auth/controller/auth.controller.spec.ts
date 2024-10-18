import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AppModule } from "../../app.module";

describe("AuthController", () => {
    let authController: AuthController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        authController = module.get<AuthController>(AuthController);
    });

    it("should be defined", () => {
        expect(authController).toBeDefined();
    });
});
