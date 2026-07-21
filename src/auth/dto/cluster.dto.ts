import { IsString } from "class-validator";

/**
 * Cluster data transfer object with ID and secret
 */
export class ClusterDto {
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
     * Creates a new cluster data transfer object
     * @param id The unique ID of the cluster
     * @param secret The used secret of the cluster
     */
    public constructor(id: string, secret: string) {
        this.id = id;
        this.secret = secret;
    }
}
