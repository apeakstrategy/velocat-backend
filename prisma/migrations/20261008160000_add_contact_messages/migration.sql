-- CreateTable
CREATE TABLE `contact_messages` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(64) NOT NULL DEFAULT '',
    `vehicle` VARCHAR(191) NOT NULL DEFAULT '',
    `message` TEXT NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'New',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `contact_messages_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
