import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger, ValidationPipe } from "@nestjs/common";
import { AuthGuard } from "./auth/gurad/auth.guard";
import { CustomWsAdapter } from "./lib/custom-ws-adapter.service";
import * as process from "node:process";
import { boolean } from "boolean";
import { TRUST_PROXY } from "./auth/constants";

/**
 * The main function that starts the NestJS application
 * and listens on the specified port
 */
async function bootstrap() {
    // Create the NestJS application
    const app = await NestFactory.create(AppModule, {
        cors: {
            origin: process.env.CORS_ORIGIN || "*",
        },
        moduleIdGeneratorAlgorithm: "deep-hash",
    });

    // Use ws adapter
    app.useWebSocketAdapter(new CustomWsAdapter(app));

    // Behind a single trusted reverse proxy, resolve the real client IP so the
    // HTTP throttler (which keys on req.ip) rate-limits per client, not per proxy.
    if (boolean(process.env[TRUST_PROXY])) {
        app.getHttpAdapter().getInstance().set("trust proxy", 1);
    }

    // Enable validation for all routes
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    // Enable authentication for all routes
    const authGuard = app.get(AuthGuard);
    app.useGlobalGuards(authGuard);

    const port = process.env.PORT || 3000;
    await app.listen(port);
    Logger.log(`Server running on http://localhost:${port}`, "Bootstrap");
}

bootstrap().catch((error) => {
    console.error(error);
    process.exit(1);
});
