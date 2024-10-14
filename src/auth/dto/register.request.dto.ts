import { IsString } from "class-validator";

/**
 * Register request data transfer object with ID
 */
export class RegisterRequestDto {
    /**
     * The unique ID of the cluster
     */
    @IsString()
    id: string;

    /**
     * Creates a new register request data transfer object
     * @param id The unique ID of the cluster
     */
    public constructor(id: string) {
        this.id = id;
    }
}
