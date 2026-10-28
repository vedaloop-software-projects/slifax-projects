-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `mobile` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `email_verified_at` TIMESTAMP(0) NULL,
    `password` VARCHAR(255) NULL,
    `remember_token` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,
    `business_name` VARCHAR(100) NOT NULL,
    `business_type_id` INTEGER NOT NULL,
    `contact_person` VARCHAR(100) NOT NULL,
    `alternate_mobile` VARCHAR(15) NULL,
    `state_id` INTEGER NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `pincode` INTEGER NOT NULL DEFAULT 0,
    `website_url` VARCHAR(255) NULL,
    `address` TEXT NOT NULL,
    `gst_number` VARCHAR(50) NULL,
    `gst_code` INTEGER NULL,
    `pan_number` VARCHAR(50) NULL,
    `upi_id` VARCHAR(255) NULL,
    `fssai_number` VARCHAR(50) NULL,
    `trade_license_number` VARCHAR(50) NULL,
    `amount` DOUBLE NOT NULL DEFAULT 0,
    `discount_type` TINYINT NOT NULL DEFAULT 0,
    `discount_value` DOUBLE NOT NULL DEFAULT 0,
    `gst` INTEGER NOT NULL DEFAULT 0,
    `gst_value` DOUBLE NOT NULL DEFAULT 0,
    `final_amount` DOUBLE NOT NULL DEFAULT 0,
    `subscription_duration` TINYINT NOT NULL DEFAULT 0,
    `subscription_amount` DOUBLE NOT NULL DEFAULT 0,
    `subscription_discount_type` TINYINT NOT NULL DEFAULT 0,
    `subscription_discount_value` DOUBLE NOT NULL DEFAULT 0,
    `subscription_gst` INTEGER NOT NULL DEFAULT 0,
    `subscription_gst_value` DOUBLE NOT NULL DEFAULT 0,
    `subscription_final_amount` DOUBLE NOT NULL DEFAULT 0,
    `paid_amount` DOUBLE NOT NULL DEFAULT 0,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `logo` VARCHAR(255) NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `users_email_unique`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `email` VARCHAR(255) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_requests` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `requester_type` VARCHAR(20) NOT NULL,
    `requester_id` BIGINT UNSIGNED NOT NULL,
    `client_id` BIGINT UNSIGNED NULL,
    `assigned_level` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `requested_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `resolved_at` TIMESTAMP(0) NULL,
    `resolved_by_type` VARCHAR(20) NULL,
    `resolved_by_id` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `password_reset_requests_queue_index`(`assigned_level`, `status`, `requested_at`),
    INDEX `password_reset_requests_requester_index`(`requester_type`, `requester_id`, `status`),
    INDEX `password_reset_requests_client_queue_index`(`client_id`, `assigned_level`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(255) NOT NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `payload` LONGTEXT NOT NULL,
    `last_activity` INTEGER NOT NULL,

    INDEX `sessions_user_id_index`(`user_id`),
    INDEX `sessions_last_activity_index`(`last_activity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cache` (
    `key` VARCHAR(255) NOT NULL,
    `value` MEDIUMTEXT NOT NULL,
    `expiration` INTEGER NOT NULL,

    INDEX `cache_expiration_index`(`expiration`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cache_locks` (
    `key` VARCHAR(255) NOT NULL,
    `owner` VARCHAR(255) NOT NULL,
    `expiration` INTEGER NOT NULL,

    INDEX `cache_locks_expiration_index`(`expiration`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jobs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `queue` VARCHAR(255) NOT NULL,
    `payload` LONGTEXT NOT NULL,
    `attempts` TINYINT UNSIGNED NOT NULL,
    `reserved_at` INTEGER UNSIGNED NULL,
    `available_at` INTEGER UNSIGNED NOT NULL,
    `created_at` INTEGER UNSIGNED NOT NULL,

    INDEX `jobs_queue_index`(`queue`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_batches` (
    `id` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `total_jobs` INTEGER NOT NULL,
    `pending_jobs` INTEGER NOT NULL,
    `failed_jobs` INTEGER NOT NULL,
    `failed_job_ids` LONGTEXT NOT NULL,
    `options` MEDIUMTEXT NULL,
    `cancelled_at` INTEGER NULL,
    `created_at` INTEGER NOT NULL,
    `finished_at` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `failed_jobs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(255) NOT NULL,
    `connection` TEXT NOT NULL,
    `queue` TEXT NOT NULL,
    `payload` LONGTEXT NOT NULL,
    `exception` LONGTEXT NOT NULL,
    `failed_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `failed_jobs_uuid_unique`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admins` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `mobile` VARCHAR(15) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `password` VARCHAR(255) NOT NULL,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `admins_mobile_unique`(`mobile`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `business_types` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `business_type` VARCHAR(100) NOT NULL,
    `display_name` VARCHAR(100) NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `features` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `feature` VARCHAR(100) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `priority` INTEGER NOT NULL DEFAULT 1,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `states` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `state_name` VARCHAR(100) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_features` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `feature_id` BIGINT UNSIGNED NOT NULL,
    `sub_feature_id` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `status` TINYINT NOT NULL DEFAULT 1,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_payments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `paid_amount` DOUBLE NOT NULL DEFAULT 0,
    `payment_mode` TINYINT NOT NULL DEFAULT 0,
    `reference_number` VARCHAR(255) NULL,
    `payment_date` DATE NULL,
    `payment_type` TINYINT NOT NULL DEFAULT 0,
    `subscription_duration` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gsts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `gst` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_roles` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `role_title` VARCHAR(255) NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `client_roles_client_id_index`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `mobile` VARCHAR(255) NULL,
    `password` VARCHAR(255) NULL,
    `role_id` INTEGER NOT NULL DEFAULT 0,
    `max_discount_percentage` DOUBLE NOT NULL DEFAULT 0,
    `is_admin` TINYINT NOT NULL DEFAULT 0,
    `otp` INTEGER NOT NULL DEFAULT 0,
    `otp_status` TINYINT NOT NULL DEFAULT 0,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `client_users_client_id_index`(`client_id`),
    INDEX `client_users_role_id_index`(`role_id`),
    INDEX `client_users_mobile_index`(`mobile`),
    INDEX `client_users_email_index`(`email`),
    INDEX `client_users_client_id_role_id_index`(`client_id`, `role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_role_features` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `role_id` BIGINT UNSIGNED NOT NULL,
    `feature_id` BIGINT UNSIGNED NOT NULL,
    `sub_feature_id` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `is_add` TINYINT NOT NULL DEFAULT 0,
    `is_edit` TINYINT NOT NULL DEFAULT 0,
    `is_view` TINYINT NOT NULL DEFAULT 0,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `client_role_features_client_id_index`(`client_id`),
    INDEX `client_role_features_role_id_index`(`role_id`),
    INDEX `client_role_features_feature_id_index`(`feature_id`),
    INDEX `client_role_features_role_id_feature_id_index`(`role_id`, `feature_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sub_features` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `feature_id` BIGINT UNSIGNED NOT NULL,
    `sub_feature` VARCHAR(100) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `priority` INTEGER NOT NULL DEFAULT 1,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `category_name` VARCHAR(100) NOT NULL,
    `category_code` VARCHAR(100) NOT NULL,
    `printer_path` VARCHAR(255) NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audits` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sub_categories` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `category_id` BIGINT UNSIGNED NOT NULL,
    `sub_category_name` VARCHAR(100) NOT NULL,
    `sub_category_code` VARCHAR(100) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brands` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `brand_name` VARCHAR(100) NOT NULL,
    `brand_code` VARCHAR(100) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `colours` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `colour_name` VARCHAR(100) NOT NULL,
    `colour_code` VARCHAR(100) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sizes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `size_name` VARCHAR(100) NOT NULL,
    `size_code` VARCHAR(100) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unit_types` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `unit_type_name` VARCHAR(100) NOT NULL,
    `unit_type_code` VARCHAR(100) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teams` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `team_name` VARCHAR(100) NOT NULL,
    `team_code` VARCHAR(100) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_modes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `payment_mode` VARCHAR(100) NOT NULL,
    `allow_change` TINYINT NOT NULL DEFAULT 0,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `taxes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `tax_code` VARCHAR(100) NOT NULL,
    `tax_name` VARCHAR(100) NOT NULL,
    `tax_percent` DOUBLE NOT NULL DEFAULT 0,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `taxes_client_id_index`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_mans` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `team_id` BIGINT UNSIGNED NULL,
    `sm_code` VARCHAR(100) NOT NULL,
    `sm_name` VARCHAR(100) NOT NULL,
    `commission_percent` DECIMAL(5, 2) NULL DEFAULT 0,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `sales_mans_client_id_index`(`client_id`),
    INDEX `sales_mans_team_id_index`(`team_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `customer_name` VARCHAR(255) NULL,
    `mobile` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL,
    `address` TEXT NULL,
    `gst` VARCHAR(255) NULL,
    `discount` DOUBLE NULL DEFAULT 0,
    `customer_type` TINYINT NOT NULL DEFAULT 0,
    `credit_limit` DOUBLE NULL DEFAULT 0,
    `credit_days` INTEGER NULL DEFAULT 0,
    `outstanding_amount` DOUBLE NULL DEFAULT 0,
    `birthday` DATE NULL,
    `anniversary` DATE NULL,
    `preferred_table` VARCHAR(255) NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `customers_client_id_index`(`client_id`),
    INDEX `customers_mobile_index`(`mobile`),
    INDEX `customers_customer_name_index`(`customer_name`),
    INDEX `customers_client_id_mobile_index`(`client_id`, `mobile`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `floors` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `floor_code` VARCHAR(100) NOT NULL,
    `floor_name` VARCHAR(100) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `table_types` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `table_type` VARCHAR(100) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tables` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `floor_id` BIGINT UNSIGNED NOT NULL,
    `table_type_id` BIGINT UNSIGNED NOT NULL,
    `table_code` VARCHAR(100) NOT NULL,
    `table_name` VARCHAR(100) NOT NULL,
    `capacity` INTEGER NOT NULL,
    `ac_non_ac` TINYINT NOT NULL DEFAULT 0,
    `table_under_maintenance` TINYINT NOT NULL DEFAULT 0,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `product_code` VARCHAR(255) NOT NULL,
    `product_short_name` VARCHAR(255) NOT NULL,
    `product_full_name` VARCHAR(255) NOT NULL,
    `category_id` BIGINT UNSIGNED NOT NULL,
    `sub_category_id` BIGINT UNSIGNED NULL,
    `brand_id` BIGINT UNSIGNED NULL,
    `unit_type_id` BIGINT UNSIGNED NULL,
    `qoh` DOUBLE NOT NULL DEFAULT 0,
    `hsn_code` VARCHAR(8) NOT NULL,
    `tax_id` BIGINT UNSIGNED NOT NULL,
    `product_image` VARCHAR(255) NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `products_client_id_index`(`client_id`),
    INDEX `products_client_code_status_index`(`client_id`, `product_code`, `status`, `trash`),
    INDEX `products_category_id_index`(`category_id`),
    INDEX `products_sub_category_id_index`(`sub_category_id`),
    INDEX `products_brand_id_index`(`brand_id`),
    INDEX `products_tax_id_index`(`tax_id`),
    INDEX `products_client_id_category_id_index`(`client_id`, `category_id`),
    INDEX `products_client_id_status_index`(`client_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_variants` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `variant_code` VARCHAR(255) NOT NULL,
    `ean_code` VARCHAR(255) NULL,
    `pack_size` VARCHAR(255) NOT NULL,
    `size_id` BIGINT UNSIGNED NULL,
    `colour_id` BIGINT UNSIGNED NULL,
    `basic_cost` DOUBLE NOT NULL DEFAULT 0,
    `cost_price` DOUBLE NOT NULL DEFAULT 0,
    `mrp` DOUBLE NOT NULL DEFAULT 0,
    `sale_price` DOUBLE NOT NULL DEFAULT 0,
    `whole_sale_price` DOUBLE NOT NULL DEFAULT 0,
    `dine_in_price` DOUBLE NOT NULL DEFAULT 0,
    `take_away_price` DOUBLE NOT NULL DEFAULT 0,
    `salon_duration` INTEGER NULL,
    `variant_qty` DOUBLE NOT NULL DEFAULT 0,
    `priority` INTEGER NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `product_variants_client_id_index`(`client_id`),
    INDEX `product_variants_product_id_index`(`product_id`),
    INDEX `product_variants_size_id_index`(`size_id`),
    INDEX `product_variants_colour_id_index`(`colour_id`),
    INDEX `product_variants_client_id_product_id_index`(`client_id`, `product_id`),
    INDEX `product_variants_client_variant_code_index`(`client_id`, `variant_code`, `status`, `trash`),
    INDEX `product_variants_client_ean_code_index`(`client_id`, `ean_code`, `status`, `trash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_controls` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `allow_weighing_scale` TINYINT NOT NULL DEFAULT 0,
    `allow_decimals` TINYINT NOT NULL DEFAULT 0,
    `allow_discount` TINYINT NOT NULL DEFAULT 0,
    `allow_price_override` TINYINT NOT NULL DEFAULT 0,
    `kot_required` TINYINT NOT NULL DEFAULT 0,
    `kit` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense_heads` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `expense_head` VARCHAR(100) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `expense_heads_client_id_status_index`(`client_id`, `status`),
    INDEX `expense_heads_client_id_expense_head_index`(`client_id`, `expense_head`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `expense_head_id` BIGINT UNSIGNED NOT NULL,
    `receipt_num` VARCHAR(255) NOT NULL,
    `transaction_date` DATE NOT NULL,
    `expense_type` TINYINT NOT NULL,
    `amount` DOUBLE NOT NULL DEFAULT 0,
    `remarks` VARCHAR(255) NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `expenses_client_id_transaction_date_index`(`client_id`, `transaction_date`),
    INDEX `expenses_expense_head_id_index`(`expense_head_id`),
    INDEX `expenses_receipt_num_index`(`receipt_num`),
    INDEX `expenses_client_id_expense_type_index`(`client_id`, `expense_type`),
    INDEX `expenses_client_id_status_index`(`client_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_role_billing_access` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `role_id` BIGINT UNSIGNED NOT NULL,
    `allow_discount` TINYINT NOT NULL,
    `allow_price_override` TINYINT NOT NULL,
    `allow_refund` TINYINT NOT NULL,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `client_role_billing_access_client_id_index`(`client_id`),
    INDEX `client_role_billing_access_role_id_index`(`role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hardware_settings` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `printer_path` VARCHAR(255) NULL,
    `network_path` VARCHAR(255) NULL,
    `kot_printer_path` VARCHAR(255) NULL,
    `barcode_path` VARCHAR(255) NULL,
    `barcode_printer_name` VARCHAR(255) NULL,
    `barcode_port` VARCHAR(255) NULL,
    `weighing_machine_brand` VARCHAR(255) NULL,
    `weighing_machine_port` VARCHAR(255) NULL,
    `cash_drawer` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `billing_settings` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `bill_prefix` VARCHAR(255) NULL,
    `bill_caption` VARCHAR(255) NULL,
    `payment_mode_id` INTEGER NOT NULL DEFAULT 0,
    `bill_format_number` VARCHAR(255) NULL,
    `refund_days` VARCHAR(255) NULL,
    `discount_on_discounted_items` TINYINT NOT NULL DEFAULT 0,
    `company_logo_on_bills` TINYINT NOT NULL DEFAULT 0,
    `confirmation_to_print_bill` TINYINT NOT NULL DEFAULT 0,
    `ask_salesman_code` TINYINT NOT NULL DEFAULT 0,
    `happy_hours` TINYINT NOT NULL DEFAULT 0,
    `ask_qty_while_adding_items` TINYINT NOT NULL DEFAULT 0,
    `print_token_category_wise` TINYINT NOT NULL DEFAULT 0,
    `enable_split_summary` TINYINT NOT NULL DEFAULT 0,
    `reset_bill_no_after_day_close` TINYINT NOT NULL DEFAULT 0,
    `qr_code_in_bill` TINYINT NOT NULL DEFAULT 0,
    `exclusive_gst_billing` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `billing_settings_descriptions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kot_settings_descriptions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kot_settings` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `kot_prefix` VARCHAR(255) NULL,
    `enable_kot` TINYINT NOT NULL DEFAULT 0,
    `enable_kds` TINYINT NOT NULL DEFAULT 0,
    `print_kot_category_wise` TINYINT NOT NULL DEFAULT 0,
    `enable_take_away` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hot_keys_settings` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NOT NULL,
    `short_key` VARCHAR(255) NULL,
    `status` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `key_mapping_masters` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `key_name` VARCHAR(255) NULL,
    `short_key` VARCHAR(255) NULL,
    `status` TINYINT NOT NULL DEFAULT 0,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bill_col_masters` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `col_name` VARCHAR(255) NULL,
    `app_status` TINYINT NOT NULL DEFAULT 0,
    `status` TINYINT NOT NULL DEFAULT 0,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `key_mapping_settings` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `key_mapping_id` BIGINT UNSIGNED NOT NULL,
    `short_key` VARCHAR(255) NULL,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bill_col_settings` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `bill_col_id` BIGINT UNSIGNED NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `group_wise_discounts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `group_type` TINYINT NOT NULL DEFAULT 0,
    `group_id` BIGINT UNSIGNED NOT NULL,
    `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `from_date` DATE NULL,
    `to_date` DATE NULL,
    `status` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `group_wise_discounts_client_id_index`(`client_id`),
    INDEX `group_wise_discounts_group_type_index`(`group_type`),
    INDEX `group_wise_discounts_group_id_index`(`group_id`),
    INDEX `group_wise_discounts_from_date_to_date_index`(`from_date`, `to_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_wise_discounts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NOT NULL,
    `purchase_qty` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `free_product_id` BIGINT UNSIGNED NOT NULL,
    `free_variant_id` BIGINT UNSIGNED NOT NULL,
    `free_qty` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `discount_percentage` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `discount_value` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `from_date` DATE NULL,
    `to_date` DATE NULL,
    `status` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `item_wise_discounts_client_id_index`(`client_id`),
    INDEX `item_wise_discounts_product_id_index`(`product_id`),
    INDEX `item_wise_discounts_variant_id_index`(`variant_id`),
    INDEX `item_wise_discounts_from_date_to_date_index`(`from_date`, `to_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_wise_discounts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NOT NULL,
    `from_date` DATE NULL,
    `to_date` DATE NULL,
    `status` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `purchase_wise_discounts_client_id_index`(`client_id`),
    INDEX `purchase_wise_discounts_product_id_index`(`product_id`),
    INDEX `purchase_wise_discounts_variant_id_index`(`variant_id`),
    INDEX `purchase_wise_discounts_from_date_to_date_index`(`from_date`, `to_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `child_purchase_wise_discounts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `purchase_wise_discount_id` BIGINT UNSIGNED NOT NULL,
    `purchase_qty` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `sale_price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `child_purchase_wise_discounts_purchase_wise_discount_id_index`(`purchase_wise_discount_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bill_busters` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `scheme_name` VARCHAR(255) NOT NULL,
    `bill_amount` DECIMAL(10, 2) NOT NULL,
    `discount_percentage` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `from_date` DATE NULL,
    `to_date` DATE NULL,
    `status` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `bill_busters_client_id_index`(`client_id`),
    INDEX `bill_busters_from_date_to_date_index`(`from_date`, `to_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `child_bill_busters` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NOT NULL,
    `bill_buster_id` BIGINT UNSIGNED NOT NULL,
    `free_qty` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `discount_percentage` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `child_bill_busters_bill_buster_id_index`(`bill_buster_id`),
    INDEX `child_bill_busters_product_id_index`(`product_id`),
    INDEX `child_bill_busters_variant_id_index`(`variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `happy_hours` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `happy_hour_name` VARCHAR(255) NOT NULL,
    `discount_percentage` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `from_time` TIME(0) NULL,
    `to_time` TIME(0) NULL,
    `from_date` DATE NULL,
    `to_date` DATE NULL,
    `status` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `happy_hours_client_id_index`(`client_id`),
    INDEX `happy_hours_from_date_to_date_index`(`from_date`, `to_date`),
    INDEX `happy_hours_from_time_to_time_index`(`from_time`, `to_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `child_happy_hours` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NOT NULL,
    `happy_hour_id` BIGINT UNSIGNED NOT NULL,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `child_happy_hours_happy_hour_id_index`(`happy_hour_id`),
    INDEX `child_happy_hours_product_id_index`(`product_id`),
    INDEX `child_happy_hours_variant_id_index`(`variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `group_wise_happy_hours` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `happy_hour_name` VARCHAR(255) NOT NULL,
    `from_time` TIME(0) NULL,
    `to_time` TIME(0) NULL,
    `from_date` DATE NULL,
    `to_date` DATE NULL,
    `status` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `group_wise_happy_hours_client_id_index`(`client_id`),
    INDEX `group_wise_happy_hours_from_date_to_date_index`(`from_date`, `to_date`),
    INDEX `group_wise_happy_hours_from_time_to_time_index`(`from_time`, `to_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `child_group_wise_happy_hours` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `group_type` TINYINT NOT NULL DEFAULT 0,
    `group_id` BIGINT UNSIGNED NOT NULL,
    `discount_percentage` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `group_wise_happy_hour_id` BIGINT UNSIGNED NOT NULL,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `child_group_wise_happy_hours_group_wise_happy_hour_id_index`(`group_wise_happy_hour_id`),
    INDEX `child_group_wise_happy_hours_group_type_group_id_index`(`group_type`, `group_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupon_usage_types` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupons` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `coupon_name` VARCHAR(255) NOT NULL,
    `coupon_code` VARCHAR(255) NOT NULL,
    `min_amount` DECIMAL(10, 2) NOT NULL,
    `discount_percentage` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `discount_value` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `from_date` DATE NULL,
    `to_date` DATE NULL,
    `coupon_usage_type_id` BIGINT UNSIGNED NOT NULL,
    `validation_mode` TINYINT NOT NULL DEFAULT 0,
    `lock_days` INTEGER NOT NULL DEFAULT 0,
    `status` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `coupons_client_id_index`(`client_id`),
    INDEX `coupons_from_date_to_date_index`(`from_date`, `to_date`),
    UNIQUE INDEX `coupons_coupon_code_unique`(`coupon_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bill_master` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `bill_num` INTEGER NOT NULL,
    `bill_date` DATETIME(0) NOT NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `sm_id` BIGINT UNSIGNED NULL,
    `total_amount` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `manual_discount_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `manual_discount_value` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `sub_total_amount` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `other_charges` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `round_off_value` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `net_amount` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `gst_amount` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `exclusive_net_amount` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `bill_mode` TINYINT NOT NULL DEFAULT 1,
    `refund_against_bill_num` VARCHAR(255) NULL,
    `refund_against_bill_date` DATE NULL,
    `customer_id` BIGINT UNSIGNED NULL,
    `narration` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `bill_master_client_id_bill_num_index`(`client_id`, `bill_num`),
    INDEX `bill_master_client_id_bill_date_index`(`client_id`, `bill_date`),
    INDEX `bill_master_customer_id_index`(`customer_id`),
    INDEX `bill_master_user_id_index`(`user_id`),
    INDEX `bill_master_sm_id_index`(`sm_id`),
    INDEX `bill_master_refund_against_bill_num_index`(`refund_against_bill_num`),
    INDEX `bill_master_refund_against_bill_date_index`(`refund_against_bill_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bill_tran` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `bill_num` INTEGER NOT NULL,
    `bill_date` DATETIME(0) NOT NULL,
    `line_num` INTEGER NOT NULL DEFAULT 1,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NULL,
    `qty` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `mrp` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `sale_price` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `price_override` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `manual_discount_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `manual_discount_value` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `void_flag` TINYINT NOT NULL DEFAULT 0,
    `bill_mode` TINYINT NOT NULL DEFAULT 1,
    `gst_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `gst_amount` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `cost_price` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `sm_id` BIGINT UNSIGNED NULL,
    `scheme_type` INTEGER NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `bill_tran_client_id_bill_num_index`(`client_id`, `bill_num`),
    INDEX `bill_tran_product_id_index`(`product_id`),
    INDEX `bill_tran_variant_id_index`(`variant_id`),
    INDEX `bill_tran_user_id_index`(`user_id`),
    INDEX `bill_tran_sm_id_index`(`sm_id`),
    INDEX `bill_tran_bill_num_product_id_index`(`bill_num`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prev_bill_master` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `bill_num` INTEGER NOT NULL,
    `bill_date` DATETIME(0) NOT NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `sm_id` BIGINT UNSIGNED NULL,
    `total_amount` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `manual_discount_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `manual_discount_value` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `sub_total_amount` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `other_charges` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `round_off_value` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `net_amount` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `gst_amount` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `exclusive_net_amount` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `bill_mode` TINYINT NOT NULL DEFAULT 1,
    `refund_against_bill_num` VARCHAR(255) NULL,
    `refund_against_bill_date` DATE NULL,
    `customer_id` BIGINT UNSIGNED NULL,
    `narration` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `prev_bill_master_client_id_bill_num_index`(`client_id`, `bill_num`),
    INDEX `prev_bill_master_client_id_bill_date_index`(`client_id`, `bill_date`),
    INDEX `prev_bill_master_customer_id_index`(`customer_id`),
    INDEX `prev_bill_master_user_id_index`(`user_id`),
    INDEX `prev_bill_master_sm_id_index`(`sm_id`),
    INDEX `prev_bill_master_refund_against_bill_num_index`(`refund_against_bill_num`),
    INDEX `prev_bill_master_refund_against_bill_date_index`(`refund_against_bill_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prev_bill_tran` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `bill_num` INTEGER NOT NULL,
    `bill_date` DATETIME(0) NOT NULL,
    `line_num` INTEGER NOT NULL DEFAULT 1,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NULL,
    `qty` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `mrp` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `sale_price` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `price_override` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `manual_discount_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `manual_discount_value` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `void_flag` TINYINT NOT NULL DEFAULT 0,
    `bill_mode` TINYINT NOT NULL DEFAULT 1,
    `gst_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `gst_amount` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `cost_price` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `sm_id` BIGINT UNSIGNED NULL,
    `scheme_type` INTEGER NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `prev_bill_tran_client_id_bill_num_index`(`client_id`, `bill_num`),
    INDEX `prev_bill_tran_product_id_index`(`product_id`),
    INDEX `prev_bill_tran_variant_id_index`(`variant_id`),
    INDEX `prev_bill_tran_user_id_index`(`user_id`),
    INDEX `prev_bill_tran_sm_id_index`(`sm_id`),
    INDEX `prev_bill_tran_bill_num_product_id_index`(`bill_num`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `temp_bill_tran` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NULL,
    `qty` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `mrp` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `sale_price` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `price_override` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `cost_price` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `line_num` INTEGER NOT NULL DEFAULT 1,
    `void_flag` TINYINT NOT NULL DEFAULT 0,
    `gst_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `gst_amount` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `manual_discount_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `manual_discount_value` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `sm_id` BIGINT UNSIGNED NULL,
    `bill_mode` TINYINT NOT NULL DEFAULT 1,
    `scheme_type` INTEGER NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `free_prod_id` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `free_variant_id` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `free_qty` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `temp_bill_tran_client_id_user_id_index`(`client_id`, `user_id`),
    INDEX `temp_bill_tran_client_id_product_id_variant_id_index`(`client_id`, `product_id`, `variant_id`),
    INDEX `temp_bill_tran_client_id_scheme_type_index`(`client_id`, `scheme_type`),
    INDEX `temp_bill_tran_product_id_index`(`product_id`),
    INDEX `temp_bill_tran_variant_id_index`(`variant_id`),
    INDEX `temp_bill_tran_free_prod_id_index`(`free_prod_id`),
    INDEX `temp_bill_tran_free_variant_id_index`(`free_variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suspended_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `suspended_number` VARCHAR(255) NOT NULL,
    `suspended_date` DATETIME(0) NOT NULL,
    `line_num` INTEGER NOT NULL DEFAULT 1,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NULL,
    `qty` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `void_flag` TINYINT NOT NULL DEFAULT 0,
    `sm_id` BIGINT UNSIGNED NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `customer_name` VARCHAR(255) NULL,
    `customer_mobile` VARCHAR(20) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `suspended_items_client_id_user_id_index`(`client_id`, `user_id`),
    INDEX `suspended_items_client_id_user_id_suspended_date_index`(`client_id`, `user_id`, `suspended_date`),
    INDEX `suspended_items_client_id_suspended_number_index`(`client_id`, `suspended_number`),
    INDEX `suspended_items_customer_mobile_index`(`customer_mobile`),
    INDEX `suspended_items_product_id_index`(`product_id`),
    INDEX `suspended_items_variant_id_index`(`variant_id`),
    INDEX `suspended_items_sm_id_index`(`sm_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bill_payments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `bill_num` INTEGER NOT NULL,
    `bill_date` DATETIME(0) NOT NULL,
    `payment_mode_id` BIGINT UNSIGNED NOT NULL,
    `amount` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `tendered_change` TINYINT NOT NULL DEFAULT 0,
    `user_id` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `bill_payments_client_id_bill_num_bill_date_index`(`client_id`, `bill_num`, `bill_date`),
    INDEX `bill_payments_payment_mode_id_index`(`payment_mode_id`),
    INDEX `bill_payments_user_id_index`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prev_bill_payments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `bill_num` INTEGER NOT NULL,
    `bill_date` DATETIME(0) NOT NULL,
    `payment_mode_id` BIGINT UNSIGNED NOT NULL,
    `amount` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `tendered_change` TINYINT NOT NULL DEFAULT 0,
    `user_id` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `prev_bill_payments_client_id_bill_num_bill_date_index`(`client_id`, `bill_num`, `bill_date`),
    INDEX `prev_bill_payments_payment_mode_id_index`(`payment_mode_id`),
    INDEX `prev_bill_payments_user_id_index`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_breakup` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `bill_num` INTEGER NOT NULL,
    `bill_date` DATETIME(0) NOT NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `tax_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `tax_amount` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `amount` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `tax_breakup_client_id_bill_num_bill_date_index`(`client_id`, `bill_num`, `bill_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `stock_date` DATE NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NULL,
    `purchase` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `transfer_in` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `transfer_out` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `stock_take` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `damage_stock` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `sales` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `purchase_return` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `sales_value` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `gst_amount` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `discount` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `free_qty` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `free_sales` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `opening_balance` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `closeing_balance` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `cost_value` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `created_by` BIGINT UNSIGNED NULL,
    `updated_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `stock_client_id_index`(`client_id`),
    INDEX `stock_stock_date_index`(`stock_date`),
    INDEX `stock_product_id_index`(`product_id`),
    INDEX `stock_variant_id_index`(`variant_id`),
    INDEX `stock_client_id_stock_date_index`(`client_id`, `stock_date`),
    INDEX `stock_client_id_product_id_index`(`client_id`, `product_id`),
    INDEX `stock_product_id_variant_id_index`(`product_id`, `variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_summary` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `payment_date` DATE NOT NULL,
    `payment_mode_id` INTEGER NOT NULL DEFAULT 0,
    `amount` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `payment_summary_client_id_index`(`client_id`),
    INDEX `payment_summary_payment_date_index`(`payment_date`),
    INDEX `payment_summary_payment_mode_id_index`(`payment_mode_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `day_close_details` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `day_close_date` DATETIME(0) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `day_close_details_client_id_index`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transfer_in_mast` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `transfer_in_number` BIGINT UNSIGNED NOT NULL,
    `transfer_in_date` DATE NOT NULL,
    `received_from` VARCHAR(255) NOT NULL,
    `total_amount` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `status` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `transfer_in_mast_transfer_in_number_index`(`transfer_in_number`),
    INDEX `transfer_in_mast_transfer_in_date_index`(`transfer_in_date`),
    INDEX `trf_in_no_dt_cli_idx`(`transfer_in_number`, `transfer_in_date`, `client_id`),
    INDEX `transfer_in_mast_client_id_index`(`client_id`),
    UNIQUE INDEX `transfer_in_mast_transfer_in_number_unique`(`transfer_in_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transfer_in_tran` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `transfer_in_id` BIGINT UNSIGNED NOT NULL,
    `transfer_in_number` BIGINT UNSIGNED NOT NULL,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `line_num` INTEGER NOT NULL DEFAULT 1,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NOT NULL,
    `cost_price` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `mrp` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `qty` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `free_qty` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `transfer_in_tran_transfer_in_id_index`(`transfer_in_id`),
    INDEX `transfer_in_tran_transfer_in_number_index`(`transfer_in_number`),
    INDEX `transfer_in_tran_product_id_index`(`product_id`),
    INDEX `transfer_in_tran_variant_id_index`(`variant_id`),
    INDEX `transfer_in_tran_client_id_index`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transfer_out_mast` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `transfer_out_number` BIGINT UNSIGNED NOT NULL,
    `transfer_out_date` DATE NOT NULL,
    `send_to` VARCHAR(255) NOT NULL,
    `total_amount` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `remarks` TEXT NULL,
    `status` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `transfer_out_mast_transfer_out_number_index`(`transfer_out_number`),
    INDEX `transfer_out_mast_transfer_out_date_index`(`transfer_out_date`),
    INDEX `trf_out_no_dt_cli_idx`(`transfer_out_number`, `transfer_out_date`, `client_id`),
    INDEX `transfer_out_mast_client_id_index`(`client_id`),
    UNIQUE INDEX `transfer_out_mast_transfer_out_number_unique`(`transfer_out_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transfer_out_tran` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `transfer_out_id` BIGINT UNSIGNED NOT NULL,
    `transfer_out_number` BIGINT UNSIGNED NOT NULL,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `line_num` INTEGER NOT NULL DEFAULT 1,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NOT NULL,
    `cost_price` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `mrp` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `qty` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `transfer_out_tran_transfer_out_id_index`(`transfer_out_id`),
    INDEX `transfer_out_tran_transfer_out_number_index`(`transfer_out_number`),
    INDEX `transfer_out_tran_product_id_index`(`product_id`),
    INDEX `transfer_out_tran_variant_id_index`(`variant_id`),
    INDEX `transfer_out_tran_client_id_index`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_adjustments_mast` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `stock_adjustment_date` DATE NOT NULL,
    `reason` TEXT NOT NULL,
    `total_amount` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `status` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `stock_adjustments_mast_stock_adjustment_date_index`(`stock_adjustment_date`),
    INDEX `client_id`(`stock_adjustment_date`),
    INDEX `stock_adjustments_mast_client_id_index`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_adjustments_tran` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `stock_adjustment_id` BIGINT UNSIGNED NOT NULL,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `line_num` INTEGER NOT NULL DEFAULT 1,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NOT NULL,
    `cost_price` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `mrp` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `qty` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `reason` TEXT NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `stock_adjustments_tran_stock_adjustment_id_index`(`stock_adjustment_id`),
    INDEX `stock_adjustments_tran_product_id_index`(`product_id`),
    INDEX `stock_adjustments_tran_variant_id_index`(`variant_id`),
    INDEX `stock_adjustments_tran_client_id_index`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kit_master` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `kit_product_id` BIGINT UNSIGNED NOT NULL,
    `kit_variant_id` BIGINT UNSIGNED NOT NULL,
    `created_by` BIGINT UNSIGNED NOT NULL,
    `updated_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `kit_master_client_id_index`(`client_id`),
    INDEX `kit_master_kit_product_id_index`(`kit_product_id`),
    INDEX `kit_master_kit_variant_id_index`(`kit_variant_id`),
    UNIQUE INDEX `uk_kit_master`(`client_id`, `kit_product_id`, `kit_variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kit_master_details` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `kit_master_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NOT NULL,
    `qty` DECIMAL(10, 2) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `kit_master_details_product_id_index`(`product_id`),
    INDEX `kit_master_details_variant_id_index`(`variant_id`),
    UNIQUE INDEX `uk_kit_master_details`(`kit_master_id`, `product_id`, `variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `designations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `designation` VARCHAR(100) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `employee_code` VARCHAR(50) NOT NULL,
    `employee_name` VARCHAR(100) NOT NULL,
    `gender` TINYINT NOT NULL,
    `mobile` VARCHAR(10) NOT NULL,
    `category_id` BIGINT UNSIGNED NOT NULL,
    `designation_id` BIGINT UNSIGNED NOT NULL,
    `from_time` TIME(0) NOT NULL,
    `to_time` TIME(0) NOT NULL,
    `week_off` INTEGER NULL,
    `address` TEXT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL DEFAULT 0,
    `updated_by` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `employees_client_id_trash_index`(`client_id`, `trash`),
    INDEX `employees_client_id_category_id_index`(`client_id`, `category_id`),
    INDEX `employees_client_id_designation_id_index`(`client_id`, `designation_id`),
    INDEX `employees_client_id_mobile_index`(`client_id`, `mobile`),
    INDEX `employees_client_id_employee_name_index`(`client_id`, `employee_name`),
    INDEX `employees_client_id_status_index`(`client_id`, `status`),
    INDEX `employees_category_id_index`(`category_id`),
    INDEX `employees_designation_id_index`(`designation_id`),
    UNIQUE INDEX `employees_client_id_employee_code_unique`(`client_id`, `employee_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kit_mast_sales` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NOT NULL,
    `qty` DECIMAL(10, 2) NOT NULL,
    `sale_price` DECIMAL(10, 3) NOT NULL,
    `cost_price` DECIMAL(10, 3) NOT NULL,
    `sale_date` DATE NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `kit_mast_sales_client_id_sale_date_index`(`client_id`, `sale_date`),
    INDEX `kit_mast_sales_client_id_product_id_variant_id_index`(`client_id`, `product_id`, `variant_id`),
    INDEX `kit_mast_sales_client_id_user_id_index`(`client_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kit_tran_sales` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `kit_mast_sale_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NOT NULL,
    `qty` DECIMAL(10, 2) NOT NULL,
    `sale_price` DECIMAL(10, 3) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `kit_tran_sales_kit_mast_sale_id_index`(`kit_mast_sale_id`),
    INDEX `kit_tran_sales_product_id_index`(`product_id`),
    INDEX `kit_tran_sales_variant_id_index`(`variant_id`),
    INDEX `kit_tran_sales_kit_mast_sale_id_product_id_variant_id_index`(`kit_mast_sale_id`, `product_id`, `variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `table_sessions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `table_id` BIGINT UNSIGNED NOT NULL,
    `waiter_id` BIGINT UNSIGNED NULL,
    `customer_id` BIGINT UNSIGNED NULL,
    `reservation_id` BIGINT UNSIGNED NULL,
    `session_status` TINYINT NOT NULL DEFAULT 1,
    `checkin_time` DATETIME(0) NULL,
    `checkout_time` DATETIME(0) NULL,
    `bill_no` VARCHAR(255) NULL,
    `bill_date` DATE NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `updated_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `table_sessions_client_id_index`(`client_id`),
    INDEX `table_sessions_table_id_index`(`table_id`),
    INDEX `table_sessions_waiter_id_index`(`waiter_id`),
    INDEX `table_sessions_customer_id_index`(`customer_id`),
    INDEX `table_sessions_session_status_index`(`session_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kot_mast` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `kot_no` VARCHAR(30) NOT NULL,
    `kot_date` DATE NULL,
    `table_session_id` BIGINT UNSIGNED NOT NULL,
    `table_id` BIGINT UNSIGNED NOT NULL,
    `waiter_id` BIGINT UNSIGNED NULL,
    `kot_status` TINYINT NOT NULL DEFAULT 1,
    `remarks` TEXT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `updated_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `kot_mast_client_id_index`(`client_id`),
    INDEX `kot_mast_kot_no_index`(`kot_no`),
    INDEX `kot_mast_table_session_id_index`(`table_session_id`),
    INDEX `kot_mast_table_id_index`(`table_id`),
    INDEX `kot_mast_waiter_id_index`(`waiter_id`),
    INDEX `kot_mast_kot_status_index`(`kot_status`),
    UNIQUE INDEX `uk_client_kotdate_kotno`(`client_id`, `kot_date`, `kot_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kot_tran` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `kot_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NOT NULL,
    `qty` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `price` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `item_status` TINYINT NOT NULL DEFAULT 1,
    `remarks` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `kot_tran_client_id_index`(`client_id`),
    INDEX `kot_tran_kot_id_index`(`kot_id`),
    INDEX `kot_tran_product_id_index`(`product_id`),
    INDEX `kot_tran_variant_id_index`(`variant_id`),
    INDEX `kot_tran_item_status_index`(`item_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kot_bill_mast` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `bill_no` VARCHAR(255) NOT NULL,
    `bill_date` DATETIME(0) NOT NULL,
    `bill_type` TINYINT NOT NULL DEFAULT 0,
    `table_session_id` BIGINT UNSIGNED NULL,
    `table_id` BIGINT UNSIGNED NULL,
    `waiter_id` BIGINT UNSIGNED NULL,
    `customer_id` BIGINT UNSIGNED NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount_percentage` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `tax` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `additional_charges` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `round_off_value` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `grand_total` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `coupon_id` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `bill_mode` TINYINT NOT NULL DEFAULT 1,
    `created_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `kot_bill_mast_client_id_index`(`client_id`),
    INDEX `kot_bill_mast_bill_no_index`(`bill_no`),
    INDEX `kot_bill_mast_bill_date_index`(`bill_date`),
    INDEX `kot_bill_mast_bill_type_index`(`bill_type`),
    INDEX `kot_bill_mast_table_session_id_index`(`table_session_id`),
    INDEX `kot_bill_mast_table_id_index`(`table_id`),
    INDEX `kot_bill_mast_waiter_id_index`(`waiter_id`),
    INDEX `kot_bill_mast_customer_id_index`(`customer_id`),
    INDEX `kot_bill_mast_user_id_index`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kot_bill_tran` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `bill_no` VARCHAR(255) NOT NULL,
    `bill_date` DATETIME(0) NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NOT NULL,
    `qty` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `price` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `waiter_id` BIGINT UNSIGNED NULL,
    `discount_percentage` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `gst_percentage` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `gst_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `kot_bill_tran_client_id_index`(`client_id`),
    INDEX `kot_bill_tran_bill_no_index`(`bill_no`),
    INDEX `kot_bill_tran_bill_date_index`(`bill_date`),
    INDEX `kot_bill_tran_product_id_index`(`product_id`),
    INDEX `kot_bill_tran_variant_id_index`(`variant_id`),
    INDEX `kot_bill_tran_user_id_index`(`user_id`),
    INDEX `kot_bill_tran_waiter_id_index`(`waiter_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `table_reservations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `table_id` BIGINT UNSIGNED NOT NULL,
    `customer_id` BIGINT UNSIGNED NULL,
    `no_of_persons` INTEGER NOT NULL,
    `reservation_time` DATETIME(0) NOT NULL,
    `duration_minutes` INTEGER NOT NULL DEFAULT 90,
    `waiter_id` BIGINT UNSIGNED NULL,
    `remarks` TEXT NULL,
    `reservation_status` TINYINT NOT NULL DEFAULT 1,
    `created_by` BIGINT UNSIGNED NULL,
    `updated_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `table_reservations_reservation_time_index`(`reservation_time`),
    INDEX `table_reservations_reservation_status_index`(`reservation_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kot_bill_payments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `bill_no` VARCHAR(255) NOT NULL,
    `bill_date` DATETIME(0) NOT NULL,
    `payment_mode_id` BIGINT UNSIGNED NOT NULL,
    `amount` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `tendered_change` TINYINT NOT NULL DEFAULT 0,
    `user_id` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `kot_bill_payments_client_id_bill_no_bill_date_index`(`client_id`, `bill_no`, `bill_date`),
    INDEX `kot_bill_payments_payment_mode_id_index`(`payment_mode_id`),
    INDEX `kot_bill_payments_user_id_index`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kot_temp_tran` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `waiter_id` BIGINT UNSIGNED NULL,
    `table_session_id` BIGINT UNSIGNED NULL,
    `customer_id` BIGINT UNSIGNED NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NOT NULL,
    `qty` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `price` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `gst_percentage` DECIMAL(8, 2) NOT NULL DEFAULT 0,
    `gst_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount_percentage` DECIMAL(8, 2) NOT NULL DEFAULT 0,
    `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `coupon_id` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `kot_temp_tran_client_id_user_id_index`(`client_id`, `user_id`),
    INDEX `kot_temp_tran_table_session_id_index`(`table_session_id`),
    INDEX `kot_temp_tran_customer_id_index`(`customer_id`),
    INDEX `kot_temp_tran_product_id_index`(`product_id`),
    INDEX `kot_temp_tran_variant_id_index`(`variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kot_prev_bill_mast` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `bill_no` VARCHAR(255) NOT NULL,
    `bill_date` DATETIME(0) NOT NULL,
    `bill_type` TINYINT NOT NULL DEFAULT 0,
    `table_session_id` BIGINT UNSIGNED NULL,
    `table_id` BIGINT UNSIGNED NULL,
    `waiter_id` BIGINT UNSIGNED NULL,
    `customer_id` BIGINT UNSIGNED NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount_percentage` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `tax` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `additional_charges` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `round_off_value` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `grand_total` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `coupon_id` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `bill_mode` TINYINT NOT NULL DEFAULT 1,
    `created_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `kot_prev_bill_mast_client_id_index`(`client_id`),
    INDEX `kot_prev_bill_mast_bill_no_index`(`bill_no`),
    INDEX `kot_prev_bill_mast_bill_date_index`(`bill_date`),
    INDEX `kot_prev_bill_mast_bill_type_index`(`bill_type`),
    INDEX `kot_prev_bill_mast_table_session_id_index`(`table_session_id`),
    INDEX `kot_prev_bill_mast_table_id_index`(`table_id`),
    INDEX `kot_prev_bill_mast_waiter_id_index`(`waiter_id`),
    INDEX `kot_prev_bill_mast_customer_id_index`(`customer_id`),
    INDEX `kot_prev_bill_mast_user_id_index`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kot_prev_bill_tran` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `bill_no` VARCHAR(255) NOT NULL,
    `bill_date` DATETIME(0) NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED NOT NULL,
    `qty` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `price` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `waiter_id` BIGINT UNSIGNED NULL,
    `discount_percentage` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `gst_percentage` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `gst_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `kot_prev_bill_tran_client_id_index`(`client_id`),
    INDEX `kot_prev_bill_tran_bill_no_index`(`bill_no`),
    INDEX `kot_prev_bill_tran_bill_date_index`(`bill_date`),
    INDEX `kot_prev_bill_tran_product_id_index`(`product_id`),
    INDEX `kot_prev_bill_tran_variant_id_index`(`variant_id`),
    INDEX `kot_prev_bill_tran_user_id_index`(`user_id`),
    INDEX `kot_prev_bill_tran_waiter_id_index`(`waiter_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salon_appointments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `customer_id` BIGINT UNSIGNED NOT NULL,
    `appointment_date` DATE NOT NULL,
    `appointment_time` TIME(0) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `remarks` TEXT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `updated_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `salon_appointments_client_id_index`(`client_id`),
    INDEX `salon_appointments_customer_id_index`(`customer_id`),
    INDEX `salon_appointments_appointment_date_index`(`appointment_date`),
    INDEX `salon_appointments_appointment_date_status_index`(`appointment_date`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointment_services` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `appointment_id` BIGINT UNSIGNED NOT NULL,
    `category_id` BIGINT UNSIGNED NOT NULL,
    `sub_category_id` BIGINT UNSIGNED NULL,
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `duration` INTEGER NULL,
    `price` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `appointment_services_appointment_id_index`(`appointment_id`),
    INDEX `appointment_services_category_id_index`(`category_id`),
    INDEX `appointment_services_sub_category_id_index`(`sub_category_id`),
    INDEX `appointment_services_employee_id_index`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bill_formats` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `business_type_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `size` VARCHAR(100) NOT NULL,
    `file` VARCHAR(255) NOT NULL,
    `file_type` VARCHAR(20) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `trash` TINYINT NOT NULL DEFAULT 0,
    `created_by` BIGINT UNSIGNED NULL,
    `updated_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `bill_formats_business_type_id_index`(`business_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `kit_master_details` ADD CONSTRAINT `kit_master_details_kit_master_id_foreign` FOREIGN KEY (`kit_master_id`) REFERENCES `kit_master`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `table_sessions` ADD CONSTRAINT `table_sessions_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `table_sessions` ADD CONSTRAINT `table_sessions_table_id_foreign` FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `table_sessions` ADD CONSTRAINT `table_sessions_waiter_id_foreign` FOREIGN KEY (`waiter_id`) REFERENCES `client_users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `table_sessions` ADD CONSTRAINT `table_sessions_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `table_sessions` ADD CONSTRAINT `table_sessions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `client_users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `table_sessions` ADD CONSTRAINT `table_sessions_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `client_users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_mast` ADD CONSTRAINT `kot_mast_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_mast` ADD CONSTRAINT `kot_mast_table_session_id_foreign` FOREIGN KEY (`table_session_id`) REFERENCES `table_sessions`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_mast` ADD CONSTRAINT `kot_mast_table_id_foreign` FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_mast` ADD CONSTRAINT `kot_mast_waiter_id_foreign` FOREIGN KEY (`waiter_id`) REFERENCES `client_users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_mast` ADD CONSTRAINT `kot_mast_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `client_users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_tran` ADD CONSTRAINT `kot_tran_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_tran` ADD CONSTRAINT `kot_tran_kot_id_foreign` FOREIGN KEY (`kot_id`) REFERENCES `kot_mast`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_tran` ADD CONSTRAINT `kot_tran_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_tran` ADD CONSTRAINT `kot_tran_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_bill_mast` ADD CONSTRAINT `kot_bill_mast_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_bill_mast` ADD CONSTRAINT `kot_bill_mast_table_session_id_foreign` FOREIGN KEY (`table_session_id`) REFERENCES `table_sessions`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_bill_mast` ADD CONSTRAINT `kot_bill_mast_table_id_foreign` FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_bill_mast` ADD CONSTRAINT `kot_bill_mast_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_bill_mast` ADD CONSTRAINT `kot_bill_mast_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `client_users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_bill_tran` ADD CONSTRAINT `kot_bill_tran_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_bill_tran` ADD CONSTRAINT `kot_bill_tran_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_bill_tran` ADD CONSTRAINT `kot_bill_tran_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `table_reservations` ADD CONSTRAINT `table_reservations_table_id_foreign` FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `table_reservations` ADD CONSTRAINT `table_reservations_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `table_reservations` ADD CONSTRAINT `table_reservations_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `client_users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `table_reservations` ADD CONSTRAINT `table_reservations_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `client_users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_prev_bill_mast` ADD CONSTRAINT `kot_prev_bill_mast_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_prev_bill_mast` ADD CONSTRAINT `kot_prev_bill_mast_table_session_id_foreign` FOREIGN KEY (`table_session_id`) REFERENCES `table_sessions`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_prev_bill_mast` ADD CONSTRAINT `kot_prev_bill_mast_table_id_foreign` FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_prev_bill_mast` ADD CONSTRAINT `kot_prev_bill_mast_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_prev_bill_mast` ADD CONSTRAINT `kot_prev_bill_mast_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `client_users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_prev_bill_tran` ADD CONSTRAINT `kot_prev_bill_tran_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_prev_bill_tran` ADD CONSTRAINT `kot_prev_bill_tran_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `kot_prev_bill_tran` ADD CONSTRAINT `kot_prev_bill_tran_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- Tenant integration registry and encrypted credential vault
CREATE TABLE IF NOT EXISTS `integration_providers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'payment_gateway',
  `description` varchar(500) DEFAULT NULL,
  `credential_schema` json NOT NULL,
  `status` tinyint NOT NULL DEFAULT 1,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`), UNIQUE KEY `integration_providers_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_integration_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `provider_id` bigint unsigned NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'requested',
  `tenant_notes` varchar(1000) DEFAULT NULL,
  `admin_notes` varchar(1000) DEFAULT NULL,
  `requested_by` bigint unsigned NOT NULL,
  `handled_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_integration_requests_client_provider_unique` (`client_id`,`provider_id`),
  KEY `tenant_integration_requests_status_index` (`status`),
  KEY `tenant_integration_requests_provider_index` (`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_integrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `provider_id` bigint unsigned NOT NULL,
  `environment` varchar(20) NOT NULL DEFAULT 'sandbox',
  `encrypted_credentials` longtext NOT NULL,
  `public_config` json DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `configured_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_integrations_client_provider_unique` (`client_id`,`provider_id`),
  KEY `tenant_integrations_status_index` (`status`),
  KEY `tenant_integrations_provider_index` (`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_gateway_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `provider_id` bigint unsigned NOT NULL,
  `merchant_reference` varchar(50) NOT NULL,
  `external_order_id` varchar(100) NOT NULL,
  `amount_in_paise` bigint unsigned NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'INR',
  `status` varchar(30) NOT NULL DEFAULT 'created',
  `redirect_url` text DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_gateway_transactions_reference_unique` (`client_id`,`provider_id`,`merchant_reference`),
  KEY `payment_gateway_transactions_order_index` (`external_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `integration_providers`
  (`code`,`name`,`category`,`description`,`credential_schema`,`status`,`created_at`,`updated_at`)
VALUES
  ('pinelabs','Pine Labs','payment_gateway','Pine Labs online payment gateway',
   JSON_ARRAY(
     JSON_OBJECT('key','clientId','label','Client ID','secret',false,'required',true),
     JSON_OBJECT('key','clientSecret','label','Client Secret','secret',true,'required',true),
     JSON_OBJECT('key','merchantId','label','Merchant ID','secret',false,'required',false)
   ),1,NOW(),NOW()),
  ('phonepe','PhonePe','payment_gateway','PhonePe payment gateway',
   JSON_ARRAY(
     JSON_OBJECT('key','clientId','label','Client ID','secret',false,'required',true),
     JSON_OBJECT('key','clientSecret','label','Client Secret','secret',true,'required',true),
     JSON_OBJECT('key','clientVersion','label','Client Version','secret',false,'required',true)
   ),1,NOW(),NOW())
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`),`description`=VALUES(`description`),`credential_schema`=VALUES(`credential_schema`),`updated_at`=NOW();

CREATE TABLE IF NOT EXISTS `support_incidents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` BIGINT UNSIGNED NULL,
  `user_id` BIGINT UNSIGNED NULL,
  `source` VARCHAR(20) NOT NULL,
  `priority` VARCHAR(2) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `resolution_steps` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'open',
  `request_id` VARCHAR(64) NULL,
  `method` VARCHAR(10) NULL,
  `path` VARCHAR(500) NULL,
  `status_code` INT NULL,
  `signature` CHAR(64) NULL,
  `occurrence_count` INT NOT NULL DEFAULT 1,
  `first_seen_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `support_incidents_priority_status_index` (`priority`, `status`, `last_seen_at`),
  KEY `support_incidents_client_status_index` (`client_id`, `status`, `last_seen_at`),
  KEY `support_incidents_signature_index` (`signature`, `last_seen_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `integration_providers` (`code`,`name`,`category`,`description`,`credential_schema`,`status`,`created_at`,`updated_at`)
VALUES ('cashfree','Cashfree','payment_gateway','Cashfree payment gateway',
  JSON_ARRAY(
    JSON_OBJECT('key','clientId','label','App ID','secret',false,'required',true),
    JSON_OBJECT('key','clientSecret','label','Secret Key','secret',true,'required',true)
  ),1,NOW(),NOW())
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`),`description`=VALUES(`description`),`credential_schema`=VALUES(`credential_schema`),`status`=1,`updated_at`=NOW();

-- Super-admin key/value settings. renewal_grace_days: days a client keeps full
-- access after its contract end date before it becomes inactive (renewal only).
-- max_devices_per_user: default number of devices one login may use at once.
CREATE TABLE IF NOT EXISTS `platform_settings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` VARCHAR(1000) NOT NULL,
  `updated_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `platform_settings_key_unique` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `platform_settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES ('renewal_grace_days', '7', NOW(), NOW()), ('max_devices_per_user', '1', NOW(), NOW())
ON DUPLICATE KEY UPDATE `setting_key` = `setting_key`;

-- Public self-registration requests reviewed by the super admin.
CREATE TABLE IF NOT EXISTS `registration_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `business_name` VARCHAR(255) NOT NULL,
  `contact_person_name` VARCHAR(255) NOT NULL,
  `mobile` VARCHAR(20) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `business_type_id` BIGINT UNSIGNED NULL,
  `city` VARCHAR(100) NULL,
  `address` TEXT NULL,
  `notes` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `client_id` BIGINT UNSIGNED NULL,
  `reviewed_by` BIGINT UNSIGNED NULL,
  `review_note` TEXT NULL,
  `reviewed_at` TIMESTAMP NULL DEFAULT NULL,
  `requester_ip` VARCHAR(64) NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `registration_requests_status_index` (`status`, `created_at`),
  KEY `registration_requests_mobile_index` (`mobile`, `status`),
  KEY `registration_requests_email_index` (`email`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One active session per client user (single-device login).
CREATE TABLE IF NOT EXISTS `client_user_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `session_id` CHAR(64) NOT NULL,
  `device_id` VARCHAR(191) NOT NULL,
  `device_name` VARCHAR(255) NULL,
  `platform` VARCHAR(50) NULL,
  `ip_address` VARCHAR(64) NULL,
  `location` VARCHAR(255) NULL,
  `last_seen_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  `revoked_at` TIMESTAMP NULL DEFAULT NULL,
  `revoked_reason` VARCHAR(50) NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `client_user_sessions_session_unique` (`session_id`),
  KEY `client_user_sessions_user_active_index` (`user_id`, `revoked_at`, `expires_at`),
  KEY `client_user_sessions_client_active_index` (`client_id`, `revoked_at`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- "New login attempt" alerts shown on the device that holds the active session.
CREATE TABLE IF NOT EXISTS `client_login_alerts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `device_name` VARCHAR(255) NULL,
  `platform` VARCHAR(50) NULL,
  `ip_address` VARCHAR(64) NULL,
  `location` VARCHAR(255) NULL,
  `seen_at` TIMESTAMP NULL DEFAULT NULL,
  `response` VARCHAR(20) NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_login_alerts_user_index` (`user_id`, `seen_at`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-client override of max_devices_per_user; NULL uses the platform default.
ALTER TABLE `users` ADD COLUMN `max_login_devices` INT NULL;
