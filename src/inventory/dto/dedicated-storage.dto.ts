import { IsInt, IsString } from "class-validator";
import { DedicatedStorage } from "@prisma/client";
import { StorageDto } from "./storage.dto";

/**
 * Dedicated storage data transfer object with resource ID and amount
 */
export class DedicatedStorageDto extends StorageDto<"dedicated"> {
    /**
     * The unique ID of the cluster
     */
    @IsString()
    resourceId: string;

    /**
     * The amount of the resource
     */
    @IsInt()
    amount: number;

    /**
     * Creates a new dedicated storage data transfer object
     * @param ownerId The ID of the owner of the storage
     * @param resourceId The unique ID of the cluster
     * @param amount The amount of the resource
     */
    public constructor(ownerId: string, resourceId: string, amount: number) {
        super("dedicated", ownerId);
        this.resourceId = resourceId;
        this.amount = amount;
    }

    /**
     * Converts a dedicated storage from the database to a dedicated storage DTO
     * @param dedicatedStorage The dedicated storage from the database
     * @returns The dedicated storage DTO
     */
    public static fromDatabase(
        dedicatedStorage: DedicatedStorage,
    ): DedicatedStorageDto {
        return new DedicatedStorageDto(
            dedicatedStorage.ownerId,
            dedicatedStorage.resourceId,
            dedicatedStorage.amount,
        );
    }
}
