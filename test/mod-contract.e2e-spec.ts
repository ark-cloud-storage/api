import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AddressInfo } from "node:net";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { AuthGuard } from "../src/auth/gurad/auth.guard";
import { CustomWsAdapter } from "../src/lib/custom-ws-adapter.service";
import { DatabaseService } from "../src/database/service/database.service";
import { createInMemoryDatabase } from "./support/in-memory-database";
import { connectMod, ModSocket } from "./support/ws-client";

const CLUSTER_ID = "test-cluster";
const CLUSTER_SECRET = "test-secret";
const AUTH_HEADERS = {
    "x-cluster-id": CLUSTER_ID,
    "x-cluster-secret": CLUSTER_SECRET,
};

describe("Mod contract (e2e)", () => {
    let app: INestApplication;
    let port: number;
    let sockets: ModSocket[];

    beforeEach(async () => {
        process.env.REGISTER_CLUSTERS = `${CLUSTER_ID}:${CLUSTER_SECRET}`;
        sockets = [];

        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(DatabaseService)
            .useValue(createInMemoryDatabase())
            .compile();

        app = moduleRef.createNestApplication();
        app.useWebSocketAdapter(new CustomWsAdapter(app));
        // No global ValidationPipe here on purpose: main and security-hardening
        // ship different pipe configs (main: no whitelist + StorageDto body type;
        // hardening: whitelist + DedicatedStorageDto body type). Valid mod payloads
        // need no validation to pass, and each branch's gateway applies its own
        // class-level pipe for WS — so omitting it keeps this suite faithful and
        // green on both branches.
        await app.init();
        app.useGlobalGuards(app.get(AuthGuard));
        await app.listen(0);
        port = (app.getHttpServer().address() as AddressInfo).port;
    });

    afterEach(async () => {
        for (const socket of sockets) socket.close();
        await app?.close();
        delete process.env.REGISTER_CLUSTERS;
    });

    async function open(headers = AUTH_HEADERS): Promise<ModSocket> {
        const socket = await connectMod(port, headers);
        sockets.push(socket);
        return socket;
    }

    async function post(body: object): Promise<void> {
        await request(app.getHttpServer())
            .post("/inventory")
            .set(AUTH_HEADERS)
            .send(body)
            .expect(201);
    }

    it("serves an empty inventory then reflects a POST over HTTP", async () => {
        await request(app.getHttpServer())
            .get("/inventory")
            .set(AUTH_HEADERS)
            .expect(200)
            .expect([]);

        await post({
            type: "dedicated",
            ownerId: 1,
            resourceId: "wood",
            amount: 10,
        });

        const res = await request(app.getHttpServer())
            .get("/inventory")
            .set(AUTH_HEADERS)
            .expect(200);
        expect(res.body).toEqual([
            { type: "dedicated", ownerId: 1, resourceId: "wood", amount: 10 },
        ]);
    });

    it("increments an existing dedicated stack on repeated POSTs", async () => {
        const body = {
            type: "dedicated",
            ownerId: 7,
            resourceId: "stone",
            amount: 5,
        };
        await post(body);
        await post(body);

        const res = await request(app.getHttpServer())
            .get("/inventory")
            .set(AUTH_HEADERS)
            .expect(200);
        expect(res.body).toEqual([
            { type: "dedicated", ownerId: 7, resourceId: "stone", amount: 10 },
        ]);
    });

    it("accepts an authenticated WebSocket connection", async () => {
        const socket = await open();
        expect(socket).toBeDefined();
    });
});
