import { IsInt, IsString } from "class-validator";

/**
 * Abstract storage data transfer object with type
 */
export abstract class StorageDto<T extends string = string> {
    /**
     * The type of the storage
     */
    @IsString()
    type: T;

    /**
     * The ID of the owner of the storage
     */
    @IsInt()
    ownerId: number;

    /**
     * Creates a new storage data transfer object
     * @param type The type of the storage
     * @param ownerId The ID of the owner of the storage
     * @protected
     */
    protected constructor(type: T, ownerId: number) {
        this.type = type;
        this.ownerId = ownerId;
    }
}
