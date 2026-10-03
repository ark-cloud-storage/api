import { IsString } from "class-validator";

/**
 * Login response containing only the authenticated cluster id.
 * The secret is intentionally never returned.
 */
export class LoginResponseDto {
    @IsString()
    id: string;

    public constructor(id: string) {
        this.id = id;
    }
}
