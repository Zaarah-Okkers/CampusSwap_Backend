-- CampusSwap SafeHome migration
-- Creates the tables the backend controllers already query but the original
-- schema never defined. Safe and idempotent — run once against the CampusSwap DB.

CREATE TABLE IF NOT EXISTS service_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  accepts_emergency TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SET @st_col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_types' AND COLUMN_NAME = 'is_active');
SET @st_ddl = IF(@st_col = 0, 'ALTER TABLE service_types ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE stmt1 FROM @st_ddl; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;

SET @st_col2 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_types' AND COLUMN_NAME = 'accepts_emergency');
SET @st_ddl2 = IF(@st_col2 = 0, 'ALTER TABLE service_types ADD COLUMN accepts_emergency TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt2 FROM @st_ddl2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_provider_profiles'
    AND COLUMN_NAME = 'accepts_emergency');
SET @ddl = IF(@col_exists = 0,
  'ALTER TABLE service_provider_profiles ADD COLUMN accepts_emergency TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  service_provider_id BIGINT UNSIGNED NULL,
  service_type_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  residence_name VARCHAR(180) NOT NULL,
  room_number VARCHAR(60) NULL,
  photo_url VARCHAR(500) NULL,
  status ENUM('pending','assigned','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  priority ENUM('normal','emergency') NOT NULL DEFAULT 'normal',
  estimated_cost DECIMAL(10,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_services_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_services_type FOREIGN KEY (service_type_id) REFERENCES service_types(id),
  INDEX idx_services_student (student_id),
  INDEX idx_services_provider (service_provider_id),
  INDEX idx_services_status (status)
);

INSERT IGNORE INTO service_types (id, name, description, is_active, accepts_emergency) VALUES
  (1, 'Plumbing', 'Leaks, pipes, blocked drains and repairs.', 1, 1),
  (2, 'Electrical', 'Electrical repairs, installations and maintenance.', 1, 1),
  (3, 'Cleaning', 'Reliable home and deep cleaning services.', 1, 0),
  (4, 'Gardening', 'Lawn care, landscaping and garden maintenance.', 1, 0),
  (5, 'Security', 'Home security and protection services.', 1, 1),
  (6, 'Handyman', 'General repairs, installations and maintenance.', 1, 0);
