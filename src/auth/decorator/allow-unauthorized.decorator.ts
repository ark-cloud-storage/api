import { applyDecorators, SetMetadata } from "@nestjs/common";
import { ALLOW_UNAUTHORIZED } from "../constants";

/**
 * Allows unauthenticated requests
 */
export function AllowUnauthorized() {
    return applyDecorators(SetMetadata(ALLOW_UNAUTHORIZED, true));
}
