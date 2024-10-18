-- CreateTable
CREATE TABLE `Cluster` (
    `id` VARCHAR(100) NOT NULL,
    `secret` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DedicatedStorage` (
    `resourceId` VARCHAR(500) NOT NULL,
    `clusterId` VARCHAR(100) NOT NULL,
    `ownerId` INTEGER NOT NULL,
    `amount` INTEGER NOT NULL,

    PRIMARY KEY (`clusterId`, `ownerId`, `resourceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
