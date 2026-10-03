import { IsInt, IsString, Max, MaxLength, Min } from "class-validator";
import { StorageDto } from "./storage.dto";

/**
 * Dedicated storage data transfer object with resource ID and amount
 */
export class DedicatedStorageDto extends StorageDto<"dedicated"> {
    /**
     * The unique ID of the cluster
     */
    @IsString()
    @MaxLength(500)
    resourceId: string;

    /**
     * The amount of the resource
     */
    @IsInt()
    @Min(-1_000_000_000)
    @Max(1_000_000_000)
    amount: number;

    /**
     * Creates a new dedicated storage data transfer object
     * @param ownerId The ID of the owner of the storage
     * @param resourceId The unique ID of the cluster
     * @param amount The amount of the resource
     */
    public constructor(ownerId: number, resourceId: string, amount: number) {
        super("dedicated", ownerId);
        this.resourceId = resourceId;
        this.amount = amount;
    }
}
