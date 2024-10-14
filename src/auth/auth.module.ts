import { Module } from "@nestjs/common";
import { AuthController } from "./controller/auth.controller";
import { AuthService } from "./service/auth.service";
import { AuthGuard } from "./gurad/auth.guard";
import { DatabaseModule } from "../database/database.module";

/**
 * The authentication module responsible for handling authentication
 */
@Module({
    imports: [DatabaseModule],
    controllers: [AuthController],
    providers: [AuthService, AuthGuard],
})
export class AuthModule {}
