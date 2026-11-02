-- Complete ZenxPOS schema for a NEW, empty database (docker-entrypoint-initdb.d runs this only
-- when the MySQL volume is empty). Generated from mysql-init + every deploy/sql migration up to
-- 20261029_client_time_zone.sql; 004-migration-baseline.sql records those migrations as applied.
-- Do not edit: change the schema with a new deploy/sql/<date>_<name>.sql migration.


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mobile` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admins_mobile_unique` (`mobile`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appointment_services` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `appointment_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  `sub_category_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `duration` int DEFAULT NULL,
  `price` decimal(15,3) NOT NULL DEFAULT '0.000',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `appointment_services_appointment_id_index` (`appointment_id`),
  KEY `appointment_services_category_id_index` (`category_id`),
  KEY `appointment_services_sub_category_id_index` (`sub_category_id`),
  KEY `appointment_services_employee_id_index` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bill_busters` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `scheme_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bill_amount` decimal(10,2) NOT NULL,
  `discount_percentage` decimal(10,2) NOT NULL DEFAULT '0.00',
  `from_date` date DEFAULT NULL,
  `to_date` date DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bill_busters_client_id_index` (`client_id`),
  KEY `bill_busters_from_date_to_date_index` (`from_date`,`to_date`),
  KEY `bill_busters_applicable_index` (`client_id`,`status`,`bill_amount`,`from_date`,`to_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bill_col_masters` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `col_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `app_status` tinyint NOT NULL DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '0',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bill_col_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `bill_col_id` bigint unsigned NOT NULL,
  `status` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bill_formats` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_type_id` bigint unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bill_formats_business_type_id_index` (`business_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bill_master` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `bill_num` int NOT NULL,
  `bill_date` datetime NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `sm_id` bigint unsigned DEFAULT NULL,
  `total_amount` decimal(15,3) NOT NULL DEFAULT '0.000',
  `manual_discount_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `manual_discount_value` decimal(15,2) NOT NULL DEFAULT '0.00',
  `sub_total_amount` decimal(15,3) NOT NULL DEFAULT '0.000',
  `other_charges` decimal(15,2) NOT NULL DEFAULT '0.00',
  `round_off_value` decimal(15,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(15,3) NOT NULL DEFAULT '0.000',
  `gst_amount` decimal(15,3) NOT NULL DEFAULT '0.000',
  `exclusive_net_amount` decimal(15,3) NOT NULL DEFAULT '0.000',
  `bill_mode` tinyint NOT NULL DEFAULT '1',
  `refund_against_bill_num` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refund_against_bill_date` date DEFAULT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `narration` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bill_master_client_id_bill_num_index` (`client_id`,`bill_num`),
  KEY `bill_master_client_id_bill_date_index` (`client_id`,`bill_date`),
  KEY `bill_master_customer_id_index` (`customer_id`),
  KEY `bill_master_user_id_index` (`user_id`),
  KEY `bill_master_sm_id_index` (`sm_id`),
  KEY `bill_master_refund_against_bill_num_index` (`refund_against_bill_num`),
  KEY `bill_master_refund_against_bill_date_index` (`refund_against_bill_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bill_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `bill_num` int NOT NULL,
  `bill_date` datetime NOT NULL,
  `payment_mode_id` bigint unsigned NOT NULL,
  `amount` decimal(15,3) NOT NULL DEFAULT '0.000',
  `tendered_change` tinyint NOT NULL DEFAULT '0',
  `user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bill_payments_client_id_bill_num_bill_date_index` (`client_id`,`bill_num`,`bill_date`),
  KEY `bill_payments_payment_mode_id_index` (`payment_mode_id`),
  KEY `bill_payments_user_id_index` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bill_tran` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `bill_num` int NOT NULL,
  `bill_date` datetime NOT NULL,
  `line_num` int NOT NULL DEFAULT '1',
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `qty` decimal(10,3) NOT NULL DEFAULT '0.000',
  `mrp` decimal(10,2) NOT NULL DEFAULT '0.00',
  `sale_price` decimal(10,3) NOT NULL DEFAULT '0.000',
  `price_override` decimal(10,3) NOT NULL DEFAULT '0.000',
  `manual_discount_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `manual_discount_value` decimal(10,2) NOT NULL DEFAULT '0.00',
  `void_flag` tinyint NOT NULL DEFAULT '0',
  `bill_mode` tinyint NOT NULL DEFAULT '1',
  `gst_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `gst_amount` decimal(10,3) NOT NULL DEFAULT '0.000',
  `cost_price` decimal(10,3) NOT NULL DEFAULT '0.000',
  `sm_id` bigint unsigned DEFAULT NULL,
  `scheme_type` int DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bill_tran_client_id_bill_num_index` (`client_id`,`bill_num`),
  KEY `bill_tran_product_id_index` (`product_id`),
  KEY `bill_tran_variant_id_index` (`variant_id`),
  KEY `bill_tran_user_id_index` (`user_id`),
  KEY `bill_tran_sm_id_index` (`sm_id`),
  KEY `bill_tran_bill_num_product_id_index` (`bill_num`,`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `billing_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `bill_prefix` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bill_caption` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_mode_id` int NOT NULL DEFAULT '0',
  `bill_format_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refund_days` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discount_on_discounted_items` tinyint NOT NULL DEFAULT '0',
  `company_logo_on_bills` tinyint NOT NULL DEFAULT '0',
  `confirmation_to_print_bill` tinyint NOT NULL DEFAULT '0',
  `ask_salesman_code` tinyint NOT NULL DEFAULT '0',
  `happy_hours` tinyint NOT NULL DEFAULT '0',
  `ask_qty_while_adding_items` tinyint NOT NULL DEFAULT '0',
  `print_token_category_wise` tinyint NOT NULL DEFAULT '0',
  `enable_split_summary` tinyint NOT NULL DEFAULT '0',
  `reset_bill_no_after_day_close` tinyint NOT NULL DEFAULT '0',
  `qr_code_in_bill` tinyint NOT NULL DEFAULT '0',
  `exclusive_gst_billing` tinyint NOT NULL DEFAULT '0',
  `allow_negative_inventory` tinyint NOT NULL DEFAULT '1',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `billing_settings_client_id_index` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `billing_settings_descriptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brands` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `brand_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `business_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `category_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `printer_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `child_bill_busters` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `bill_buster_id` bigint unsigned NOT NULL,
  `free_qty` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_percentage` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `child_bill_busters_bill_buster_id_index` (`bill_buster_id`),
  KEY `child_bill_busters_product_id_index` (`product_id`),
  KEY `child_bill_busters_variant_id_index` (`variant_id`),
  KEY `child_bill_busters_client_parent_index` (`client_id`,`bill_buster_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `child_group_wise_happy_hours` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `group_type` tinyint NOT NULL DEFAULT '0',
  `group_id` bigint unsigned NOT NULL,
  `discount_percentage` decimal(10,2) NOT NULL DEFAULT '0.00',
  `group_wise_happy_hour_id` bigint unsigned NOT NULL,
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `child_group_wise_happy_hours_group_wise_happy_hour_id_index` (`group_wise_happy_hour_id`),
  KEY `child_group_wise_happy_hours_group_type_group_id_index` (`group_type`,`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `child_happy_hours` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `happy_hour_id` bigint unsigned NOT NULL,
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `child_happy_hours_happy_hour_id_index` (`happy_hour_id`),
  KEY `child_happy_hours_product_id_index` (`product_id`),
  KEY `child_happy_hours_variant_id_index` (`variant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `child_purchase_wise_discounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `purchase_wise_discount_id` bigint unsigned NOT NULL,
  `purchase_qty` decimal(10,2) NOT NULL DEFAULT '0.00',
  `sale_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `child_purchase_wise_discounts_purchase_wise_discount_id_index` (`purchase_wise_discount_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_features` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `feature_id` bigint unsigned NOT NULL,
  `sub_feature_id` bigint unsigned NOT NULL DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '1',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_login_alerts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `device_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `platform` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `seen_at` timestamp NULL DEFAULT NULL,
  `response` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_login_alerts_user_index` (`user_id`,`seen_at`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `paid_amount` double NOT NULL DEFAULT '0',
  `payment_mode` tinyint NOT NULL DEFAULT '0',
  `reference_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `payment_type` tinyint NOT NULL DEFAULT '0',
  `subscription_duration` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_role_billing_access` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  `allow_discount` tinyint NOT NULL,
  `allow_price_override` tinyint NOT NULL,
  `allow_refund` tinyint NOT NULL,
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_role_billing_access_client_id_index` (`client_id`),
  KEY `client_role_billing_access_role_id_index` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_role_features` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  `feature_id` bigint unsigned NOT NULL,
  `sub_feature_id` bigint unsigned NOT NULL DEFAULT '0',
  `is_add` tinyint NOT NULL DEFAULT '0',
  `is_edit` tinyint NOT NULL DEFAULT '0',
  `is_view` tinyint NOT NULL DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_role_features_client_id_index` (`client_id`),
  KEY `client_role_features_role_id_index` (`role_id`),
  KEY `client_role_features_feature_id_index` (`feature_id`),
  KEY `client_role_features_role_id_feature_id_index` (`role_id`,`feature_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `role_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_roles_client_id_index` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_user_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `session_id` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `platform` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_seen_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NOT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `revoked_reason` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `client_user_sessions_session_unique` (`session_id`),
  KEY `client_user_sessions_user_active_index` (`user_id`,`revoked_at`,`expires_at`),
  KEY `client_user_sessions_client_active_index` (`client_id`,`revoked_at`,`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role_id` int NOT NULL DEFAULT '0',
  `max_discount_percentage` double NOT NULL DEFAULT '0',
  `is_admin` tinyint NOT NULL DEFAULT '0',
  `otp` int NOT NULL DEFAULT '0',
  `otp_status` tinyint NOT NULL DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_users_client_id_index` (`client_id`),
  KEY `client_users_role_id_index` (`role_id`),
  KEY `client_users_mobile_index` (`mobile`),
  KEY `client_users_email_index` (`email`),
  KEY `client_users_client_id_role_id_index` (`client_id`,`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `colours` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `colour_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `colour_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupon_usage_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `coupon_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `coupon_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `min_amount` decimal(10,2) NOT NULL,
  `discount_percentage` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_value` decimal(10,2) NOT NULL DEFAULT '0.00',
  `from_date` date DEFAULT NULL,
  `to_date` date DEFAULT NULL,
  `coupon_usage_type_id` bigint unsigned NOT NULL,
  `validation_mode` tinyint NOT NULL DEFAULT '0',
  `lock_days` int NOT NULL DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coupons_coupon_code_unique` (`coupon_code`),
  KEY `coupons_client_id_index` (`client_id`),
  KEY `coupons_from_date_to_date_index` (`from_date`,`to_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `gst` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discount` double DEFAULT '0',
  `customer_type` tinyint NOT NULL DEFAULT '0',
  `credit_limit` double DEFAULT '0',
  `credit_days` int DEFAULT '0',
  `outstanding_amount` double DEFAULT '0',
  `birthday` date DEFAULT NULL,
  `anniversary` date DEFAULT NULL,
  `preferred_table` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customers_client_id_index` (`client_id`),
  KEY `customers_mobile_index` (`mobile`),
  KEY `customers_customer_name_index` (`customer_name`),
  KEY `customers_client_id_mobile_index` (`client_id`,`mobile`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `day_close_details` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `day_close_date` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `day_close_details_client_id_index` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `designations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `designation` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_letterheads` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `letterhead_key` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `design` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `document_letterheads_key_unique` (`letterhead_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `employee_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` tinyint NOT NULL,
  `mobile` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  `designation_id` bigint unsigned NOT NULL,
  `from_time` time NOT NULL,
  `to_time` time NOT NULL,
  `week_off` int DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employees_client_id_employee_code_unique` (`client_id`,`employee_code`),
  KEY `employees_client_id_trash_index` (`client_id`,`trash`),
  KEY `employees_client_id_category_id_index` (`client_id`,`category_id`),
  KEY `employees_client_id_designation_id_index` (`client_id`,`designation_id`),
  KEY `employees_client_id_mobile_index` (`client_id`,`mobile`),
  KEY `employees_client_id_employee_name_index` (`client_id`,`employee_name`),
  KEY `employees_client_id_status_index` (`client_id`,`status`),
  KEY `employees_category_id_index` (`category_id`),
  KEY `employees_designation_id_index` (`designation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_heads` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `expense_head` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `expense_heads_client_id_status_index` (`client_id`,`status`),
  KEY `expense_heads_client_id_expense_head_index` (`client_id`,`expense_head`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `expense_head_id` bigint unsigned NOT NULL,
  `receipt_num` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `transaction_date` date NOT NULL,
  `expense_type` tinyint NOT NULL,
  `amount` double NOT NULL DEFAULT '0',
  `remarks` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `expenses_client_id_transaction_date_index` (`client_id`,`transaction_date`),
  KEY `expenses_expense_head_id_index` (`expense_head_id`),
  KEY `expenses_receipt_num_index` (`receipt_num`),
  KEY `expenses_client_id_expense_type_index` (`client_id`,`expense_type`),
  KEY `expenses_client_id_status_index` (`client_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `features` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `feature` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `priority` int NOT NULL DEFAULT '1',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `floors` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `floor_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `floor_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_wise_discounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `group_type` tinyint NOT NULL DEFAULT '0',
  `group_id` bigint unsigned NOT NULL,
  `discount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `from_date` date DEFAULT NULL,
  `to_date` date DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `group_wise_discounts_client_id_index` (`client_id`),
  KEY `group_wise_discounts_group_type_index` (`group_type`),
  KEY `group_wise_discounts_group_id_index` (`group_id`),
  KEY `group_wise_discounts_from_date_to_date_index` (`from_date`,`to_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_wise_happy_hours` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `happy_hour_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `from_time` time DEFAULT NULL,
  `to_time` time DEFAULT NULL,
  `from_date` date DEFAULT NULL,
  `to_date` date DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `group_wise_happy_hours_client_id_index` (`client_id`),
  KEY `group_wise_happy_hours_from_date_to_date_index` (`from_date`,`to_date`),
  KEY `group_wise_happy_hours_from_time_to_time_index` (`from_time`,`to_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gsts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `gst` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `happy_hours` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `happy_hour_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount_percentage` decimal(10,2) NOT NULL DEFAULT '0.00',
  `from_time` time DEFAULT NULL,
  `to_time` time DEFAULT NULL,
  `from_date` date DEFAULT NULL,
  `to_date` date DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `happy_hours_client_id_index` (`client_id`),
  KEY `happy_hours_from_date_to_date_index` (`from_date`,`to_date`),
  KEY `happy_hours_from_time_to_time_index` (`from_time`,`to_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hardware_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `printer_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `network_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kot_printer_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `barcode_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `barcode_printer_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `barcode_port` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `weighing_machine_brand` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `weighing_machine_port` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `print_mode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'escpos',
  `paper_width` smallint NOT NULL DEFAULT '80',
  `weighing_baud_rate` int NOT NULL DEFAULT '9600',
  `weighing_data_bits` tinyint NOT NULL DEFAULT '8',
  `weighing_stop_bits` tinyint NOT NULL DEFAULT '1',
  `weighing_parity` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `cash_drawer` tinyint NOT NULL DEFAULT '0',
  `cash_drawer_pin` tinyint NOT NULL DEFAULT '0',
  `open_drawer_after_sale` tinyint NOT NULL DEFAULT '1',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hot_keys_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `short_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `integration_providers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'payment_gateway',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `credential_schema` json NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `integration_providers_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_wise_discounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `purchase_qty` decimal(10,2) NOT NULL DEFAULT '0.00',
  `free_product_id` bigint unsigned NOT NULL,
  `free_variant_id` bigint unsigned NOT NULL,
  `free_qty` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_percentage` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_value` decimal(10,2) NOT NULL DEFAULT '0.00',
  `from_date` date DEFAULT NULL,
  `to_date` date DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `item_wise_discounts_client_id_index` (`client_id`),
  KEY `item_wise_discounts_product_id_index` (`product_id`),
  KEY `item_wise_discounts_variant_id_index` (`variant_id`),
  KEY `item_wise_discounts_from_date_to_date_index` (`from_date`,`to_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `key_mapping_masters` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `key_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `short_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `key_mapping_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `key_mapping_id` bigint unsigned NOT NULL,
  `short_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kit_mast_sales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `qty` decimal(10,2) NOT NULL,
  `sale_price` decimal(10,3) NOT NULL,
  `cost_price` decimal(10,3) NOT NULL,
  `sale_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `kit_mast_sales_client_id_sale_date_index` (`client_id`,`sale_date`),
  KEY `kit_mast_sales_client_id_product_id_variant_id_index` (`client_id`,`product_id`,`variant_id`),
  KEY `kit_mast_sales_client_id_user_id_index` (`client_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kit_master` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `kit_product_id` bigint unsigned NOT NULL,
  `kit_variant_id` bigint unsigned NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_kit_master` (`client_id`,`kit_product_id`,`kit_variant_id`),
  KEY `kit_master_client_id_index` (`client_id`),
  KEY `kit_master_kit_product_id_index` (`kit_product_id`),
  KEY `kit_master_kit_variant_id_index` (`kit_variant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kit_master_details` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `kit_master_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `qty` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_kit_master_details` (`kit_master_id`,`product_id`,`variant_id`),
  KEY `kit_master_details_product_id_index` (`product_id`),
  KEY `kit_master_details_variant_id_index` (`variant_id`),
  CONSTRAINT `kit_master_details_kit_master_id_foreign` FOREIGN KEY (`kit_master_id`) REFERENCES `kit_master` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kit_tran_sales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `kit_mast_sale_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `qty` decimal(10,2) NOT NULL,
  `sale_price` decimal(10,3) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `kit_tran_sales_kit_mast_sale_id_index` (`kit_mast_sale_id`),
  KEY `kit_tran_sales_product_id_index` (`product_id`),
  KEY `kit_tran_sales_variant_id_index` (`variant_id`),
  KEY `kit_tran_sales_kit_mast_sale_id_product_id_variant_id_index` (`kit_mast_sale_id`,`product_id`,`variant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kot_bill_mast` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `bill_no` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bill_date` datetime NOT NULL,
  `bill_type` tinyint NOT NULL DEFAULT '0',
  `table_session_id` bigint unsigned DEFAULT NULL,
  `table_id` bigint unsigned DEFAULT NULL,
  `waiter_id` bigint unsigned DEFAULT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_percentage` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tax` decimal(12,2) NOT NULL DEFAULT '0.00',
  `additional_charges` decimal(12,2) NOT NULL DEFAULT '0.00',
  `round_off_value` decimal(10,2) NOT NULL DEFAULT '0.00',
  `grand_total` decimal(12,3) NOT NULL DEFAULT '0.000',
  `coupon_id` bigint unsigned NOT NULL DEFAULT '0',
  `bill_mode` tinyint NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `kot_bill_mast_client_id_index` (`client_id`),
  KEY `kot_bill_mast_bill_no_index` (`bill_no`),
  KEY `kot_bill_mast_bill_date_index` (`bill_date`),
  KEY `kot_bill_mast_bill_type_index` (`bill_type`),
  KEY `kot_bill_mast_table_session_id_index` (`table_session_id`),
  KEY `kot_bill_mast_table_id_index` (`table_id`),
  KEY `kot_bill_mast_waiter_id_index` (`waiter_id`),
  KEY `kot_bill_mast_customer_id_index` (`customer_id`),
  KEY `kot_bill_mast_user_id_index` (`user_id`),
  KEY `kot_bill_mast_created_by_foreign` (`created_by`),
  CONSTRAINT `kot_bill_mast_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `kot_bill_mast_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `client_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `kot_bill_mast_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `kot_bill_mast_table_id_foreign` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `kot_bill_mast_table_session_id_foreign` FOREIGN KEY (`table_session_id`) REFERENCES `table_sessions` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kot_bill_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `bill_no` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bill_date` datetime NOT NULL,
  `payment_mode_id` bigint unsigned NOT NULL,
  `amount` decimal(15,3) NOT NULL DEFAULT '0.000',
  `tendered_change` tinyint NOT NULL DEFAULT '0',
  `user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `kot_bill_payments_client_id_bill_no_bill_date_index` (`client_id`,`bill_no`,`bill_date`),
  KEY `kot_bill_payments_payment_mode_id_index` (`payment_mode_id`),
  KEY `kot_bill_payments_user_id_index` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kot_bill_tran` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `bill_no` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bill_date` datetime NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `qty` decimal(10,2) NOT NULL DEFAULT '1.00',
  `price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `waiter_id` bigint unsigned DEFAULT NULL,
  `discount_percentage` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `gst_percentage` decimal(12,2) NOT NULL DEFAULT '0.00',
  `gst_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `kot_bill_tran_client_id_index` (`client_id`),
  KEY `kot_bill_tran_bill_no_index` (`bill_no`),
  KEY `kot_bill_tran_bill_date_index` (`bill_date`),
  KEY `kot_bill_tran_product_id_index` (`product_id`),
  KEY `kot_bill_tran_variant_id_index` (`variant_id`),
  KEY `kot_bill_tran_user_id_index` (`user_id`),
  KEY `kot_bill_tran_waiter_id_index` (`waiter_id`),
  CONSTRAINT `kot_bill_tran_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `kot_bill_tran_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `kot_bill_tran_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kot_mast` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `kot_no` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kot_date` date DEFAULT NULL,
  `table_session_id` bigint unsigned NOT NULL,
  `table_id` bigint unsigned NOT NULL,
  `waiter_id` bigint unsigned DEFAULT NULL,
  `kot_status` tinyint NOT NULL DEFAULT '1',
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_client_kotdate_kotno` (`client_id`,`kot_date`,`kot_no`),
  KEY `kot_mast_client_id_index` (`client_id`),
  KEY `kot_mast_kot_no_index` (`kot_no`),
  KEY `kot_mast_table_session_id_index` (`table_session_id`),
  KEY `kot_mast_table_id_index` (`table_id`),
  KEY `kot_mast_waiter_id_index` (`waiter_id`),
  KEY `kot_mast_kot_status_index` (`kot_status`),
  KEY `kot_mast_created_by_foreign` (`created_by`),
  CONSTRAINT `kot_mast_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `kot_mast_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `client_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `kot_mast_table_id_foreign` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `kot_mast_table_session_id_foreign` FOREIGN KEY (`table_session_id`) REFERENCES `table_sessions` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `kot_mast_waiter_id_foreign` FOREIGN KEY (`waiter_id`) REFERENCES `client_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kot_prev_bill_mast` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `bill_no` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bill_date` datetime NOT NULL,
  `bill_type` tinyint NOT NULL DEFAULT '0',
  `table_session_id` bigint unsigned DEFAULT NULL,
  `table_id` bigint unsigned DEFAULT NULL,
  `waiter_id` bigint unsigned DEFAULT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_percentage` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tax` decimal(12,2) NOT NULL DEFAULT '0.00',
  `additional_charges` decimal(12,2) NOT NULL DEFAULT '0.00',
  `round_off_value` decimal(10,2) NOT NULL DEFAULT '0.00',
  `grand_total` decimal(12,3) NOT NULL DEFAULT '0.000',
  `coupon_id` bigint unsigned NOT NULL DEFAULT '0',
  `bill_mode` tinyint NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `kot_prev_bill_mast_client_id_index` (`client_id`),
  KEY `kot_prev_bill_mast_bill_no_index` (`bill_no`),
  KEY `kot_prev_bill_mast_bill_date_index` (`bill_date`),
  KEY `kot_prev_bill_mast_bill_type_index` (`bill_type`),
  KEY `kot_prev_bill_mast_table_session_id_index` (`table_session_id`),
  KEY `kot_prev_bill_mast_table_id_index` (`table_id`),
  KEY `kot_prev_bill_mast_waiter_id_index` (`waiter_id`),
  KEY `kot_prev_bill_mast_customer_id_index` (`customer_id`),
  KEY `kot_prev_bill_mast_user_id_index` (`user_id`),
  KEY `kot_prev_bill_mast_created_by_foreign` (`created_by`),
  CONSTRAINT `kot_prev_bill_mast_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `kot_prev_bill_mast_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `client_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `kot_prev_bill_mast_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `kot_prev_bill_mast_table_id_foreign` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `kot_prev_bill_mast_table_session_id_foreign` FOREIGN KEY (`table_session_id`) REFERENCES `table_sessions` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kot_prev_bill_tran` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `bill_no` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bill_date` datetime NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `qty` decimal(10,2) NOT NULL DEFAULT '1.00',
  `price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `waiter_id` bigint unsigned DEFAULT NULL,
  `discount_percentage` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `gst_percentage` decimal(12,2) NOT NULL DEFAULT '0.00',
  `gst_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `kot_prev_bill_tran_client_id_index` (`client_id`),
  KEY `kot_prev_bill_tran_bill_no_index` (`bill_no`),
  KEY `kot_prev_bill_tran_bill_date_index` (`bill_date`),
  KEY `kot_prev_bill_tran_product_id_index` (`product_id`),
  KEY `kot_prev_bill_tran_variant_id_index` (`variant_id`),
  KEY `kot_prev_bill_tran_user_id_index` (`user_id`),
  KEY `kot_prev_bill_tran_waiter_id_index` (`waiter_id`),
  CONSTRAINT `kot_prev_bill_tran_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `kot_prev_bill_tran_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `kot_prev_bill_tran_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kot_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `kot_prefix` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `enable_kot` tinyint NOT NULL DEFAULT '0',
  `enable_kds` tinyint NOT NULL DEFAULT '0',
  `print_kot_category_wise` tinyint NOT NULL DEFAULT '0',
  `enable_take_away` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kot_settings_descriptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kot_temp_tran` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `waiter_id` bigint unsigned DEFAULT NULL,
  `table_session_id` bigint unsigned DEFAULT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `qty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `gst_percentage` decimal(8,2) NOT NULL DEFAULT '0.00',
  `gst_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_percentage` decimal(8,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `coupon_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `kot_temp_tran_client_id_user_id_index` (`client_id`,`user_id`),
  KEY `kot_temp_tran_table_session_id_index` (`table_session_id`),
  KEY `kot_temp_tran_customer_id_index` (`customer_id`),
  KEY `kot_temp_tran_product_id_index` (`product_id`),
  KEY `kot_temp_tran_variant_id_index` (`variant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kot_tran` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `kot_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `qty` decimal(10,2) NOT NULL DEFAULT '1.00',
  `price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `item_status` tinyint NOT NULL DEFAULT '1',
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `kot_tran_client_id_index` (`client_id`),
  KEY `kot_tran_kot_id_index` (`kot_id`),
  KEY `kot_tran_product_id_index` (`product_id`),
  KEY `kot_tran_variant_id_index` (`variant_id`),
  KEY `kot_tran_item_status_index` (`item_status`),
  CONSTRAINT `kot_tran_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `kot_tran_kot_id_foreign` FOREIGN KEY (`kot_id`) REFERENCES `kot_mast` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `kot_tran_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `kot_tran_variant_id_foreign` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `requester_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requester_id` bigint unsigned NOT NULL,
  `client_id` bigint unsigned DEFAULT NULL,
  `assigned_level` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `requested_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolved_by_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resolved_by_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `password_reset_requests_queue_index` (`assigned_level`,`status`,`requested_at`),
  KEY `password_reset_requests_requester_index` (`requester_type`,`requester_id`,`status`),
  KEY `password_reset_requests_client_queue_index` (`client_id`,`assigned_level`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_gateway_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `provider_id` bigint unsigned NOT NULL,
  `merchant_reference` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `external_order_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount_in_paise` bigint unsigned NOT NULL,
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INR',
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'created',
  `redirect_url` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_gateway_transactions_reference_unique` (`client_id`,`provider_id`,`merchant_reference`),
  KEY `payment_gateway_transactions_order_index` (`external_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_modes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `payment_mode` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `allow_change` tinyint NOT NULL DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_summary` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `payment_date` date NOT NULL,
  `payment_mode_id` int NOT NULL DEFAULT '0',
  `amount` decimal(10,3) NOT NULL DEFAULT '0.000',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `payment_summary_client_id_index` (`client_id`),
  KEY `payment_summary_payment_date_index` (`payment_date`),
  KEY `payment_summary_payment_mode_id_index` (`payment_mode_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `platform_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `platform_settings_key_unique` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prev_bill_master` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `bill_num` int NOT NULL,
  `bill_date` datetime NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `sm_id` bigint unsigned DEFAULT NULL,
  `total_amount` decimal(15,3) NOT NULL DEFAULT '0.000',
  `manual_discount_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `manual_discount_value` decimal(15,2) NOT NULL DEFAULT '0.00',
  `sub_total_amount` decimal(15,3) NOT NULL DEFAULT '0.000',
  `other_charges` decimal(15,2) NOT NULL DEFAULT '0.00',
  `round_off_value` decimal(15,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(15,3) NOT NULL DEFAULT '0.000',
  `gst_amount` decimal(15,3) NOT NULL DEFAULT '0.000',
  `exclusive_net_amount` decimal(15,3) NOT NULL DEFAULT '0.000',
  `bill_mode` tinyint NOT NULL DEFAULT '1',
  `refund_against_bill_num` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refund_against_bill_date` date DEFAULT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `narration` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `prev_bill_master_client_id_bill_num_index` (`client_id`,`bill_num`),
  KEY `prev_bill_master_client_id_bill_date_index` (`client_id`,`bill_date`),
  KEY `prev_bill_master_customer_id_index` (`customer_id`),
  KEY `prev_bill_master_user_id_index` (`user_id`),
  KEY `prev_bill_master_sm_id_index` (`sm_id`),
  KEY `prev_bill_master_refund_against_bill_num_index` (`refund_against_bill_num`),
  KEY `prev_bill_master_refund_against_bill_date_index` (`refund_against_bill_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prev_bill_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `bill_num` int NOT NULL,
  `bill_date` datetime NOT NULL,
  `payment_mode_id` bigint unsigned NOT NULL,
  `amount` decimal(15,3) NOT NULL DEFAULT '0.000',
  `tendered_change` tinyint NOT NULL DEFAULT '0',
  `user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `prev_bill_payments_client_id_bill_num_bill_date_index` (`client_id`,`bill_num`,`bill_date`),
  KEY `prev_bill_payments_payment_mode_id_index` (`payment_mode_id`),
  KEY `prev_bill_payments_user_id_index` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prev_bill_tran` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `bill_num` int NOT NULL,
  `bill_date` datetime NOT NULL,
  `line_num` int NOT NULL DEFAULT '1',
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `qty` decimal(10,3) NOT NULL DEFAULT '0.000',
  `mrp` decimal(10,2) NOT NULL DEFAULT '0.00',
  `sale_price` decimal(10,3) NOT NULL DEFAULT '0.000',
  `price_override` decimal(10,3) NOT NULL DEFAULT '0.000',
  `manual_discount_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `manual_discount_value` decimal(10,2) NOT NULL DEFAULT '0.00',
  `void_flag` tinyint NOT NULL DEFAULT '0',
  `bill_mode` tinyint NOT NULL DEFAULT '1',
  `gst_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `gst_amount` decimal(10,3) NOT NULL DEFAULT '0.000',
  `cost_price` decimal(10,3) NOT NULL DEFAULT '0.000',
  `sm_id` bigint unsigned DEFAULT NULL,
  `scheme_type` int DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `prev_bill_tran_client_id_bill_num_index` (`client_id`,`bill_num`),
  KEY `prev_bill_tran_product_id_index` (`product_id`),
  KEY `prev_bill_tran_variant_id_index` (`variant_id`),
  KEY `prev_bill_tran_user_id_index` (`user_id`),
  KEY `prev_bill_tran_sm_id_index` (`sm_id`),
  KEY `prev_bill_tran_bill_num_product_id_index` (`bill_num`,`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_controls` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `allow_weighing_scale` tinyint NOT NULL DEFAULT '0',
  `allow_decimals` tinyint NOT NULL DEFAULT '0',
  `allow_discount` tinyint NOT NULL DEFAULT '0',
  `allow_price_override` tinyint NOT NULL DEFAULT '0',
  `kot_required` tinyint NOT NULL DEFAULT '0',
  `kit` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_variants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `client_id` bigint unsigned NOT NULL,
  `variant_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ean_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pack_size` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size_id` bigint unsigned DEFAULT NULL,
  `colour_id` bigint unsigned DEFAULT NULL,
  `basic_cost` double NOT NULL DEFAULT '0',
  `cost_price` double NOT NULL DEFAULT '0',
  `mrp` double NOT NULL DEFAULT '0',
  `sale_price` double NOT NULL DEFAULT '0',
  `whole_sale_price` double NOT NULL DEFAULT '0',
  `dine_in_price` double NOT NULL DEFAULT '0',
  `take_away_price` double NOT NULL DEFAULT '0',
  `salon_duration` int DEFAULT NULL,
  `variant_qty` double NOT NULL DEFAULT '0',
  `priority` int DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_variants_client_id_index` (`client_id`),
  KEY `product_variants_product_id_index` (`product_id`),
  KEY `product_variants_size_id_index` (`size_id`),
  KEY `product_variants_colour_id_index` (`colour_id`),
  KEY `product_variants_client_id_product_id_index` (`client_id`,`product_id`),
  KEY `product_variants_client_variant_code_index` (`client_id`,`variant_code`,`status`,`trash`),
  KEY `product_variants_client_ean_code_index` (`client_id`,`ean_code`,`status`,`trash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `product_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_short_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  `sub_category_id` bigint unsigned DEFAULT NULL,
  `brand_id` bigint unsigned DEFAULT NULL,
  `unit_type_id` bigint unsigned DEFAULT NULL,
  `qoh` double NOT NULL DEFAULT '0',
  `hsn_code` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tax_id` bigint unsigned NOT NULL,
  `product_image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `products_client_id_index` (`client_id`),
  KEY `products_client_code_status_index` (`client_id`,`product_code`,`status`,`trash`),
  KEY `products_category_id_index` (`category_id`),
  KEY `products_sub_category_id_index` (`sub_category_id`),
  KEY `products_brand_id_index` (`brand_id`),
  KEY `products_tax_id_index` (`tax_id`),
  KEY `products_client_id_category_id_index` (`client_id`,`category_id`),
  KEY `products_client_id_status_index` (`client_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_wise_discounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `from_date` date DEFAULT NULL,
  `to_date` date DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_wise_discounts_client_id_index` (`client_id`),
  KEY `purchase_wise_discounts_product_id_index` (`product_id`),
  KEY `purchase_wise_discounts_variant_id_index` (`variant_id`),
  KEY `purchase_wise_discounts_from_date_to_date_index` (`from_date`,`to_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registration_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `business_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_person_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mobile` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `business_type_id` bigint unsigned DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `client_id` bigint unsigned DEFAULT NULL,
  `reviewed_by` bigint unsigned DEFAULT NULL,
  `review_note` text COLLATE utf8mb4_unicode_ci,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `requester_ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `registration_requests_status_index` (`status`,`created_at`),
  KEY `registration_requests_mobile_index` (`mobile`,`status`),
  KEY `registration_requests_email_index` (`email`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_mans` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `team_id` bigint unsigned DEFAULT NULL,
  `sm_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sm_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `commission_percent` decimal(5,2) DEFAULT '0.00',
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sales_mans_client_id_index` (`client_id`),
  KEY `sales_mans_team_id_index` (`team_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salon_appointments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned NOT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` time NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `salon_appointments_client_id_index` (`client_id`),
  KEY `salon_appointments_customer_id_index` (`customer_id`),
  KEY `salon_appointments_appointment_date_index` (`appointment_date`),
  KEY `salon_appointments_appointment_date_status_index` (`appointment_date`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sizes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `size_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `states` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `state_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `stock_date` date NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `purchase` decimal(10,3) NOT NULL DEFAULT '0.000',
  `transfer_in` decimal(10,3) NOT NULL DEFAULT '0.000',
  `transfer_out` decimal(10,3) NOT NULL DEFAULT '0.000',
  `stock_take` decimal(10,3) NOT NULL DEFAULT '0.000',
  `damage_stock` decimal(10,3) NOT NULL DEFAULT '0.000',
  `sales` decimal(10,3) NOT NULL DEFAULT '0.000',
  `purchase_return` decimal(10,3) NOT NULL DEFAULT '0.000',
  `sales_value` decimal(10,3) NOT NULL DEFAULT '0.000',
  `gst_amount` decimal(10,3) NOT NULL DEFAULT '0.000',
  `discount` decimal(10,3) NOT NULL DEFAULT '0.000',
  `free_qty` decimal(10,3) NOT NULL DEFAULT '0.000',
  `free_sales` decimal(10,3) NOT NULL DEFAULT '0.000',
  `opening_balance` decimal(10,3) NOT NULL DEFAULT '0.000',
  `closeing_balance` decimal(10,3) NOT NULL DEFAULT '0.000',
  `cost_value` decimal(10,3) NOT NULL DEFAULT '0.000',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `stock_client_id_index` (`client_id`),
  KEY `stock_stock_date_index` (`stock_date`),
  KEY `stock_product_id_index` (`product_id`),
  KEY `stock_variant_id_index` (`variant_id`),
  KEY `stock_client_id_stock_date_index` (`client_id`,`stock_date`),
  KEY `stock_client_id_product_id_index` (`client_id`,`product_id`),
  KEY `stock_product_id_variant_id_index` (`product_id`,`variant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_adjustments_mast` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `client_id` bigint unsigned NOT NULL,
  `stock_adjustment_date` date NOT NULL,
  `stock_type` tinyint NOT NULL DEFAULT '2' COMMENT '1-IN, 2-OUT',
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_amount` decimal(15,3) NOT NULL DEFAULT '0.000',
  `status` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `stock_adjustments_mast_stock_adjustment_date_index` (`stock_adjustment_date`),
  KEY `client_id` (`stock_adjustment_date`),
  KEY `stock_adjustments_mast_client_id_index` (`client_id`),
  KEY `stock_adjustments_mast_client_date_type_index` (`client_id`,`stock_adjustment_date`,`stock_type`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_adjustments_tran` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `stock_adjustment_id` bigint unsigned NOT NULL,
  `client_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `line_num` int NOT NULL DEFAULT '1',
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `cost_price` decimal(15,3) NOT NULL DEFAULT '0.000',
  `mrp` decimal(15,3) NOT NULL DEFAULT '0.000',
  `qty` decimal(15,3) NOT NULL DEFAULT '0.000',
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `sale_price` decimal(15,3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `stock_adjustments_tran_stock_adjustment_id_index` (`stock_adjustment_id`),
  KEY `stock_adjustments_tran_product_id_index` (`product_id`),
  KEY `stock_adjustments_tran_variant_id_index` (`variant_id`),
  KEY `stock_adjustments_tran_client_id_index` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sub_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  `sub_category_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_category_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sub_features` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `feature_id` bigint unsigned NOT NULL,
  `sub_feature` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `priority` int NOT NULL DEFAULT '1',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_incidents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `source` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `resolution_steps` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `request_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `method` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_code` int DEFAULT NULL,
  `signature` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occurrence_count` int NOT NULL DEFAULT '1',
  `first_seen_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `support_incidents_priority_status_index` (`priority`,`status`,`last_seen_at`),
  KEY `support_incidents_client_status_index` (`client_id`,`status`,`last_seen_at`),
  KEY `support_incidents_signature_index` (`signature`,`last_seen_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suspended_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `suspended_number` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `suspended_date` datetime NOT NULL,
  `line_num` int NOT NULL DEFAULT '1',
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `qty` decimal(10,3) NOT NULL DEFAULT '0.000',
  `void_flag` tinyint NOT NULL DEFAULT '0',
  `sm_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_mobile` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `suspended_items_client_id_user_id_index` (`client_id`,`user_id`),
  KEY `suspended_items_client_id_user_id_suspended_date_index` (`client_id`,`user_id`,`suspended_date`),
  KEY `suspended_items_client_id_suspended_number_index` (`client_id`,`suspended_number`),
  KEY `suspended_items_customer_mobile_index` (`customer_mobile`),
  KEY `suspended_items_product_id_index` (`product_id`),
  KEY `suspended_items_variant_id_index` (`variant_id`),
  KEY `suspended_items_sm_id_index` (`sm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_reservations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `table_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `no_of_persons` int NOT NULL,
  `reservation_time` datetime NOT NULL,
  `duration_minutes` int NOT NULL DEFAULT '90',
  `waiter_id` bigint unsigned DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `reservation_status` tinyint NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `table_reservations_reservation_time_index` (`reservation_time`),
  KEY `table_reservations_reservation_status_index` (`reservation_status`),
  KEY `table_reservations_table_id_foreign` (`table_id`),
  KEY `table_reservations_customer_id_foreign` (`customer_id`),
  KEY `table_reservations_created_by_foreign` (`created_by`),
  KEY `table_reservations_updated_by_foreign` (`updated_by`),
  CONSTRAINT `table_reservations_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `client_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `table_reservations_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `table_reservations_table_id_foreign` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `table_reservations_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `client_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `table_id` bigint unsigned NOT NULL,
  `waiter_id` bigint unsigned DEFAULT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `reservation_id` bigint unsigned DEFAULT NULL,
  `session_status` tinyint NOT NULL DEFAULT '1',
  `checkin_time` datetime DEFAULT NULL,
  `checkout_time` datetime DEFAULT NULL,
  `bill_no` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bill_date` date DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `table_sessions_client_id_index` (`client_id`),
  KEY `table_sessions_table_id_index` (`table_id`),
  KEY `table_sessions_waiter_id_index` (`waiter_id`),
  KEY `table_sessions_customer_id_index` (`customer_id`),
  KEY `table_sessions_session_status_index` (`session_status`),
  KEY `table_sessions_created_by_foreign` (`created_by`),
  KEY `table_sessions_updated_by_foreign` (`updated_by`),
  CONSTRAINT `table_sessions_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `table_sessions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `client_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `table_sessions_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `table_sessions_table_id_foreign` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `table_sessions_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `client_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `table_sessions_waiter_id_foreign` FOREIGN KEY (`waiter_id`) REFERENCES `client_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `table_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tables` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `floor_id` bigint unsigned NOT NULL,
  `table_type_id` bigint unsigned NOT NULL,
  `table_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `capacity` int NOT NULL,
  `ac_non_ac` tinyint NOT NULL DEFAULT '0',
  `table_under_maintenance` tinyint NOT NULL DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_breakup` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `bill_num` int NOT NULL,
  `bill_date` datetime NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `tax_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(10,3) NOT NULL DEFAULT '0.000',
  `amount` decimal(15,3) NOT NULL DEFAULT '0.000',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tax_breakup_client_id_bill_num_bill_date_index` (`client_id`,`bill_num`,`bill_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `taxes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `tax_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tax_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tax_percent` double NOT NULL DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `taxes_client_id_index` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teams` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `team_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `team_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `temp_bill_tran` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `qty` decimal(10,3) NOT NULL DEFAULT '0.000',
  `mrp` decimal(10,2) NOT NULL DEFAULT '0.00',
  `sale_price` decimal(10,3) NOT NULL DEFAULT '0.000',
  `price_override` decimal(10,3) NOT NULL DEFAULT '0.000',
  `cost_price` decimal(10,3) NOT NULL DEFAULT '0.000',
  `line_num` int NOT NULL DEFAULT '1',
  `void_flag` tinyint NOT NULL DEFAULT '0',
  `gst_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `gst_amount` decimal(10,3) NOT NULL DEFAULT '0.000',
  `manual_discount_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `manual_discount_value` decimal(10,2) NOT NULL DEFAULT '0.00',
  `sm_id` bigint unsigned DEFAULT NULL,
  `bill_mode` tinyint NOT NULL DEFAULT '1',
  `scheme_type` int DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `free_prod_id` bigint unsigned NOT NULL DEFAULT '0',
  `free_variant_id` bigint unsigned NOT NULL DEFAULT '0',
  `free_qty` decimal(10,3) NOT NULL DEFAULT '0.000',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `temp_bill_tran_client_id_user_id_index` (`client_id`,`user_id`),
  KEY `temp_bill_tran_client_id_product_id_variant_id_index` (`client_id`,`product_id`,`variant_id`),
  KEY `temp_bill_tran_client_id_scheme_type_index` (`client_id`,`scheme_type`),
  KEY `temp_bill_tran_product_id_index` (`product_id`),
  KEY `temp_bill_tran_variant_id_index` (`variant_id`),
  KEY `temp_bill_tran_free_prod_id_index` (`free_prod_id`),
  KEY `temp_bill_tran_free_variant_id_index` (`free_variant_id`),
  KEY `temp_bill_tran_billing_item_index` (`client_id`,`user_id`,`product_id`,`variant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenant_integration_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `provider_id` bigint unsigned NOT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `tenant_notes` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `admin_notes` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requested_by` bigint unsigned NOT NULL,
  `handled_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_integration_requests_client_provider_unique` (`client_id`,`provider_id`),
  KEY `tenant_integration_requests_status_index` (`status`),
  KEY `tenant_integration_requests_provider_index` (`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenant_integrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `provider_id` bigint unsigned NOT NULL,
  `environment` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sandbox',
  `encrypted_credentials` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `public_config` json DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `configured_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_integrations_client_provider_unique` (`client_id`,`provider_id`),
  KEY `tenant_integrations_status_index` (`status`),
  KEY `tenant_integrations_provider_index` (`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transfer_in_mast` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `client_id` bigint unsigned NOT NULL,
  `transfer_in_number` bigint unsigned NOT NULL,
  `transfer_in_date` date NOT NULL,
  `received_from` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_amount` decimal(15,3) NOT NULL DEFAULT '0.000',
  `status` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transfer_in_mast_transfer_in_number_unique` (`transfer_in_number`),
  KEY `transfer_in_mast_transfer_in_number_index` (`transfer_in_number`),
  KEY `transfer_in_mast_transfer_in_date_index` (`transfer_in_date`),
  KEY `trf_in_no_dt_cli_idx` (`transfer_in_number`,`transfer_in_date`,`client_id`),
  KEY `transfer_in_mast_client_id_index` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transfer_in_tran` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `transfer_in_id` bigint unsigned NOT NULL,
  `transfer_in_number` bigint unsigned NOT NULL,
  `client_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `line_num` int NOT NULL DEFAULT '1',
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `cost_price` decimal(15,3) NOT NULL DEFAULT '0.000',
  `mrp` decimal(15,3) NOT NULL DEFAULT '0.000',
  `qty` decimal(15,3) NOT NULL DEFAULT '0.000',
  `free_qty` decimal(15,3) NOT NULL DEFAULT '0.000',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `sale_price` decimal(15,3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `transfer_in_tran_transfer_in_id_index` (`transfer_in_id`),
  KEY `transfer_in_tran_transfer_in_number_index` (`transfer_in_number`),
  KEY `transfer_in_tran_product_id_index` (`product_id`),
  KEY `transfer_in_tran_variant_id_index` (`variant_id`),
  KEY `transfer_in_tran_client_id_index` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transfer_out_mast` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `client_id` bigint unsigned NOT NULL,
  `transfer_out_number` bigint unsigned NOT NULL,
  `transfer_out_date` date NOT NULL,
  `send_to` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_amount` decimal(15,3) NOT NULL DEFAULT '0.000',
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `status` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transfer_out_mast_transfer_out_number_unique` (`transfer_out_number`),
  KEY `transfer_out_mast_transfer_out_number_index` (`transfer_out_number`),
  KEY `transfer_out_mast_transfer_out_date_index` (`transfer_out_date`),
  KEY `trf_out_no_dt_cli_idx` (`transfer_out_number`,`transfer_out_date`,`client_id`),
  KEY `transfer_out_mast_client_id_index` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transfer_out_tran` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `transfer_out_id` bigint unsigned NOT NULL,
  `transfer_out_number` bigint unsigned NOT NULL,
  `client_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `line_num` int NOT NULL DEFAULT '1',
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned NOT NULL,
  `cost_price` decimal(15,3) NOT NULL DEFAULT '0.000',
  `mrp` decimal(15,3) NOT NULL DEFAULT '0.000',
  `qty` decimal(15,3) NOT NULL DEFAULT '0.000',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `sale_price` decimal(15,3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `transfer_out_tran_transfer_out_id_index` (`transfer_out_id`),
  KEY `transfer_out_tran_transfer_out_number_index` (`transfer_out_number`),
  KEY `transfer_out_tran_product_id_index` (`product_id`),
  KEY `transfer_out_tran_variant_id_index` (`variant_id`),
  KEY `transfer_out_tran_client_id_index` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `unit_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `unit_type_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit_type_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mobile` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `business_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `business_type_id` int NOT NULL,
  `contact_person` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alternate_mobile` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state_id` int NOT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pincode` int NOT NULL DEFAULT '0',
  `website_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `gst_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gst_code` int DEFAULT NULL,
  `pan_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `upi_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fssai_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trade_license_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` double NOT NULL DEFAULT '0',
  `discount_type` tinyint NOT NULL DEFAULT '0',
  `discount_value` double NOT NULL DEFAULT '0',
  `gst` int NOT NULL DEFAULT '0',
  `gst_value` double NOT NULL DEFAULT '0',
  `final_amount` double NOT NULL DEFAULT '0',
  `subscription_duration` tinyint NOT NULL DEFAULT '0',
  `subscription_amount` double NOT NULL DEFAULT '0',
  `subscription_discount_type` tinyint NOT NULL DEFAULT '0',
  `subscription_discount_value` double NOT NULL DEFAULT '0',
  `subscription_gst` int NOT NULL DEFAULT '0',
  `subscription_gst_value` double NOT NULL DEFAULT '0',
  `subscription_final_amount` double NOT NULL DEFAULT '0',
  `paid_amount` double NOT NULL DEFAULT '0',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `logo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `trash` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL DEFAULT '0',
  `updated_by` int NOT NULL DEFAULT '0',
  `max_login_devices` int DEFAULT NULL,
  `max_users` int DEFAULT NULL,
  `time_zone` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

