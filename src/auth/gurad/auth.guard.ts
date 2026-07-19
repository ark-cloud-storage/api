import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../service/auth.service";
import { Reflector } from "@nestjs/core";
import { ALLOW_UNAUTHORIZED } from "../constants";

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

        // Read credentials and capture the object to tag with the cluster id
        let id: string;
        let secret: string;
        let target: { clusterId?: string };
        switch (context.getType()) {
            case "http": {
                const req = context.switchToHttp().getRequest();
                id = req.headers["x-cluster-id"];
                secret = req.headers["x-cluster-secret"];
                target = req;
                break;
            }
            case "ws": {
                const client = context.switchToWs().getClient();
                id = client.upgradeHeaders["x-cluster-id"];
                secret = client.upgradeHeaders["x-cluster-secret"];
                target = client;
                break;
            }
            default:
                throw new Error("Invalid context type");
        }

        // Verify the cluster ID and secret
        if (!id || !secret) {
            throw new UnauthorizedException();
        }
        await this.authService.login(id, secret);

        // Tag the request/socket so @ClusterId() can read it per-request (race-free)
        target.clusterId = id;

        return true;
    }
}
