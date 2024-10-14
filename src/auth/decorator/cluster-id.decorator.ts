import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { CLUSTER_ID } from "../constants";

/**
 * The authorized cluster ID
 * Requires the AuthGuard to be used
 */
export const ClusterId = createParamDecorator(
    (_data: unknown, context: ExecutionContext) => {
        return Reflect.getMetadata(CLUSTER_ID, context.getHandler());
    },
);
