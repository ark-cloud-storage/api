import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import * as request from "supertest";
import { AuthController } from "./auth.controller";
import { AuthService } from "../service/auth.service";

describe("AuthController throttling", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: {
                        login: jest.fn().mockResolvedValue("cluster-1"),
                        register: jest.fn(),
                    },
                },
                { provide: APP_GUARD, useClass: ThrottlerGuard },
            ],
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it("returns 429 after exceeding the login limit", async () => {
        const server = app.getHttpServer();
        const body = { id: "cluster-1", secret: "s" };
        for (let i = 0; i < 5; i++) {
            await request(server).post("/auth/login").send(body).expect(201);
        }
        await request(server).post("/auth/login").send(body).expect(429);
    });
});
