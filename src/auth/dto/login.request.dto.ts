import { IsString } from "class-validator";

/**
 * Login request data transfer object with ID and secret
 */
export class LoginRequestDto {
    /**
     * The unique ID of the cluster
     */
    @IsString()
    id: string;

    /**
     * The used secret of the cluster
     */
    @IsString()
    secret: string;

    /**
     * Creates a new login request data transfer object
     * @param id The unique ID of the cluster
     * @param secret The used secret of the cluster
     */
    public constructor(id: string, secret: string) {
        this.id = id;
        this.secret = secret;
    }
}
