-- CreateTable
CREATE TABLE `Cluster` (
    `id` VARCHAR(100) NOT NULL,
    `secret` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DedicatedStorage` (
    `resourceId` VARCHAR(100) NOT NULL,
    `clusterId` VARCHAR(100) NOT NULL,
    `ownerId` VARCHAR(100) NOT NULL,
    `amount` INTEGER NOT NULL,

    PRIMARY KEY (`resourceId`, `clusterId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
