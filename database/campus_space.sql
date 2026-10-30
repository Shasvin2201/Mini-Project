-- =============================================================================
-- CAMPUS SPACE UTILIZATION & MANAGEMENT PLATFORM - DATABASE SCHEMA & SEED
-- Database Name: campus_space
-- Target RDBMS: MySQL 8.0+ / MariaDB 10.4+
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `campus_space` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `campus_space`;

-- -----------------------------------------------------------------------------
-- 1. Table structure for table `users`
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `requests`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `spaces`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'faculty', 'management') NOT NULL DEFAULT 'faculty',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (`email`),
  INDEX (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Table structure for table `spaces`
-- -----------------------------------------------------------------------------
CREATE TABLE `spaces` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `space_name` VARCHAR(255) NOT NULL,
  `block` VARCHAR(100) NOT NULL,
  `type` VARCHAR(100) NOT NULL,
  `capacity` INT NOT NULL,
  `status` VARCHAR(50) DEFAULT 'Available',
  INDEX (`block`),
  INDEX (`type`),
  INDEX (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Table structure for table `requests`
-- -----------------------------------------------------------------------------
CREATE TABLE `requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `faculty_id` INT NOT NULL,
  `space_id` INT NOT NULL,
  `request_date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `required_capacity` INT NOT NULL,
  `purpose` TEXT NOT NULL,
  `status` VARCHAR(50) DEFAULT 'Pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (`request_date`),
  INDEX (`status`),
  FOREIGN KEY (`faculty_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`space_id`) REFERENCES `spaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Table structure for table `audit_logs`
-- -----------------------------------------------------------------------------
CREATE TABLE `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `user_email` VARCHAR(255) NULL,
  `user_role` VARCHAR(50) NULL,
  `action` VARCHAR(100) NOT NULL,
  `target_type` VARCHAR(50) NULL,
  `target_id` INT NULL,
  `details` TEXT NULL,
  `ip_address` VARCHAR(100) DEFAULT '127.0.0.1',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (`user_id`),
  INDEX (`action`),
  INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Seed Users (Passwords hashed using bcrypt - default password for all seed accounts is: admin123 / faculty123 / management123)
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`) VALUES
(1, 'System Administrator', 'admin@campus.com', '$2b$10$HqjFMx2RhWpSKLiB4X9nL.PxXiXF4nzSsYIYNUKubQn74lajoWmgG', 'admin'),
(2, 'SHASVIN D', 'shasvind@campus.com', '$2b$10$NStVt0TuUwHabjcml/6PY.wS1DpQ9b7qyAQLIUGTo2k5MbObEnTOi', 'faculty'),
(3, 'BIT Faculty', 'bit@campus.com', '$2b$10$NStVt0TuUwHabjcml/6PY.wS1DpQ9b7qyAQLIUGTo2k5MbObEnTOi', 'faculty'),
(4, 'Campus Management', 'management@campus.com', '$2b$10$pHKtd.GFTiMLcnJvGOccyO/otEcWRR8yqwBbnG77rWnp/Z1pIz6NC', 'management');

-- Seed 20 Campus Spaces across 4 Blocks (10 Classrooms, 4 Seminar Halls, 6 Labs)
INSERT INTO `spaces` (`id`, `space_name`, `block`, `type`, `capacity`, `status`) VALUES
-- Block A
(1, 'CR-A101', 'Block A', 'Classroom', 60, 'Available'),
(2, 'CR-A102', 'Block A', 'Classroom', 40, 'Available'),
(3, 'CR-A103', 'Block A', 'Classroom', 50, 'Available'),
(4, 'LAB-A01', 'Block A', 'Lab', 30, 'Available'),
(5, 'SH-A01', 'Block A', 'Seminar Hall', 100, 'Available'),

-- Block B
(6, 'CR-B101', 'Block B', 'Classroom', 60, 'Available'),
(7, 'CR-B102', 'Block B', 'Classroom', 40, 'Available'),
(8, 'CR-B103', 'Block B', 'Classroom', 50, 'Available'),
(9, 'LAB-B01', 'Block B', 'Lab', 30, 'Available'),
(10, 'SH-B01', 'Block B', 'Seminar Hall', 100, 'Available'),

-- Block C
(11, 'CR-C101', 'Block C', 'Classroom', 60, 'Available'),
(12, 'CR-C102', 'Block C', 'Classroom', 40, 'Available'),
(13, 'LAB-C01', 'Block C', 'Lab', 30, 'Available'),
(14, 'LAB-C02', 'Block C', 'Lab', 40, 'Available'),
(15, 'SH-C01', 'Block C', 'Seminar Hall', 100, 'Available'),

-- Block D
(16, 'CR-D101', 'Block D', 'Classroom', 60, 'Available'),
(17, 'CR-D102', 'Block D', 'Classroom', 40, 'Available'),
(18, 'LAB-D01', 'Block D', 'Lab', 30, 'Available'),
(19, 'LAB-D02', 'Block D', 'Lab', 40, 'Available'),
(20, 'SH-D01', 'Block D', 'Seminar Hall', 100, 'Available');

-- Seed Sample Initial Audit Log
INSERT INTO `audit_logs` (`user_id`, `user_email`, `user_role`, `action`, `target_type`, `target_id`, `details`, `ip_address`) VALUES
(1, 'admin@campus.com', 'admin', 'SYSTEM_INITIALIZED', 'system', 1, 'Initial campus database schema and 20 baseline spaces loaded successfully', '127.0.0.1');
