import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Reads the authenticated cluster id that AuthGuard attached to the
 * request (HTTP) or client socket (WS). Exported for unit testing.
 */
export const clusterIdFactory = (
    _data: unknown,
    context: ExecutionContext,
): string | undefined => {
    switch (context.getType()) {
        case "http":
            return context.switchToHttp().getRequest().clusterId;
        case "ws":
            return context.switchToWs().getClient().clusterId;
        default:
            return undefined;
    }
};

/**
 * The authorized cluster ID. Requires the AuthGuard to have run.
 */
export const ClusterId = createParamDecorator(clusterIdFactory);
