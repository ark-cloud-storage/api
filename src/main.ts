import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger, ValidationPipe } from "@nestjs/common";
import { AuthGuard } from "./auth/gurad/auth.guard";

/**
 * The main function that starts the NestJS application
 * and listens on the specified port
 */
async function bootstrap() {
    // Create the NestJS application
    const app = await NestFactory.create(AppModule);

    // Enable validation for all routes
    app.useGlobalPipes(new ValidationPipe());

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
