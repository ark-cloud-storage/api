import {
    CanActivate,
    ExecutionContext,
    Injectable,
    SetMetadata,
    UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../service/auth.service";
import { Reflector } from "@nestjs/core";
import { ALLOW_UNAUTHORIZED, CLUSTER_ID } from "../constants";

/**
 * The authentication guard that determines whether the request is authorized
 */
@Injectable()
export class AuthGuard implements CanActivate {
    /**
     * Initializes the authentication guard
     * @param authService The authentication service
     * @param reflector The reflector
     */
    public constructor(
        private readonly authService: AuthService,
        private readonly reflector: Reflector,
    ) {}

    /**
     * Determines whether the request is authorized
     * Checks the cluster ID and secret in the request headers
     * @param context The execution context
     * @returns Whether the request is authorized
     * @throws UnauthorizedException If the request is not authorized
     * @throws Error If the database operation fails
     */
    public async canActivate(context: ExecutionContext): Promise<boolean> {
        // Allow unauthenticated requests if the handler is annotated with @AllowUnauthenticated()
        const allowUnauthenticated = this.reflector.getAllAndOverride<boolean>(
            ALLOW_UNAUTHORIZED,
            [context.getHandler(), context.getClass()],
        );
        if (allowUnauthenticated) {
            return true;
        }

        // Get cluster ID and secret from request headers
        let id: string;
        let secret: string;
        switch (context.getType()) {
            case "http":
                const httpRequest = context.switchToHttp().getRequest();
                id = httpRequest.headers["x-cluster-id"];
                secret = httpRequest.headers["x-cluster-secret"];
                break;
            case "ws":
                const wsRequest = context.switchToWs().getClient();
                id = wsRequest.upgradeHeaders["x-cluster-id"];
                secret = wsRequest.upgradeHeaders["x-cluster-secret"];
                break;
            default:
                throw new Error("Invalid context type");
        }

        // Verify the cluster ID and secret
        if (!id || !secret) {
            throw new UnauthorizedException();
        }
        const authorized = await this.authService.login(id, secret);
        if (!authorized) {
            throw new UnauthorizedException();
        }

        // Set the cluster ID metadata to be used by the @ClusterId() decorator
        SetMetadata(CLUSTER_ID, id)(context.getHandler());

        // Allow the request to proceed
        return true;
    }
}
