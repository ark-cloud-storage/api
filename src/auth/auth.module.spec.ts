import { Test, TestingModule } from "@nestjs/testing";
import { AuthModule } from "./auth.module";
import { AppModule } from "../app.module";

describe("AuthModule", () => {
    let authModule: AuthModule;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        authModule = module.get<AuthModule>(AuthModule);
    });

    it("should be defined", () => {
        expect(authModule).toBeDefined();
    });
});
