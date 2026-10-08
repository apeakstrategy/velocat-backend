-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(64) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(32) NOT NULL DEFAULT 'admin',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `description` TEXT NOT NULL,
    `features_json` JSON NOT NULL,
    `image_url` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `products_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicles` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `years` VARCHAR(64) NOT NULL,
    `description` TEXT NOT NULL,
    `features_json` JSON NOT NULL,
    `specs_json` JSON NOT NULL,
    `gallery_json` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `vehicles_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configurator_steps` (
    `id` VARCHAR(64) NOT NULL,
    `step_order` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `icon_name` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configurator_options` (
    `id` VARCHAR(64) NOT NULL,
    `step_id` VARCHAR(64) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `features_json` JSON NOT NULL,

    INDEX `configurator_options_step_id_sort_order_idx`(`step_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inquiries` (
    `id` VARCHAR(64) NOT NULL,
    `client_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(64) NOT NULL,
    `notes` TEXT NOT NULL,
    `selected_options_json` JSON NOT NULL,
    `total_estimate` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'New',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inquiries_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gallery` (
    `id` VARCHAR(64) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `image_url` TEXT NOT NULL,
    `description` TEXT NOT NULL,
    `vehicle_tag` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `gallery_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `configurator_options` ADD CONSTRAINT `configurator_options_step_id_fkey` FOREIGN KEY (`step_id`) REFERENCES `configurator_steps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
