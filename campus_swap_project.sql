DROP DATABASE IF EXISTS CampusSwap;
CREATE DATABASE CampusSwap
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE CampusSwap;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS swap_requests;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS job_reviews;
DROP TABLE IF EXISTS job_applications;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS service_types;
DROP TABLE IF EXISTS service_provider_profiles;
DROP TABLE IF EXISTS residence_payments;
DROP TABLE IF EXISTS residence_requests;
DROP TABLE IF EXISTS residences;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS safehome_reports;
DROP TABLE IF EXISTS advertisements;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS sellers;
DROP TABLE IF EXISTS universities;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- UNIVERSITIES
-- =========================================================
CREATE TABLE universities (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL UNIQUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================================================
-- USERS
-- =========================================================
CREATE TABLE users (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name       VARCHAR(150) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('student','service_provider','admin','res_manager') NOT NULL DEFAULT 'student',
  student_number  VARCHAR(50) UNIQUE NULL,
  university_id   INT UNSIGNED NULL,
  company         VARCHAR(200) NULL,
  service_type    VARCHAR(150) NULL,
  avatar_url      VARCHAR(500) NULL,
  rating          DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  rating_count    INT UNSIGNED NOT NULL DEFAULT 0,
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  is_premium      BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned       BOOLEAN NOT NULL DEFAULT FALSE,
  online          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL,
  INDEX idx_users_role (role),
  INDEX idx_users_university (university_id)
) ENGINE=InnoDB;

-- =========================================================
-- MARKETPLACE
-- =========================================================
CREATE TABLE categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE products (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seller_id       BIGINT UNSIGNED NOT NULL,
  category_id     INT UNSIGNED NULL,
  listing_type    ENUM('sale','swap','sale_and_swap','rent') NOT NULL DEFAULT 'sale',
  name            VARCHAR(200) NOT NULL,
  description     TEXT NULL,
  price           DECIMAL(10,2) NULL DEFAULT 0.00,
  rent_period     ENUM('week','month') NULL,
  swap_for        VARCHAR(255) NULL,
  condition_label VARCHAR(50) NOT NULL DEFAULT 'Good',
  condition_class VARCHAR(20) NULL,
  condition_status ENUM('new','like_new','good','fair','used') NOT NULL DEFAULT 'good',
  image_url       VARCHAR(500) NULL,
  location        VARCHAR(200) NULL,
  university_id   INT UNSIGNED NULL,
  rating          DECIMAL(2,1) DEFAULT 0.0,
  sales           INT UNSIGNED DEFAULT 0,
  status          ENUM('active','reserved','sold','removed') NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL,
  INDEX idx_products_seller (seller_id),
  INDEX idx_products_category (category_id),
  INDEX idx_products_status (status),
  INDEX idx_products_listing_type (listing_type),
  INDEX idx_products_university (university_id),
  INDEX idx_products_price (price)
) ENGINE=InnoDB;

CREATE TABLE favorites (
  user_id     BIGINT UNSIGNED NOT NULL,
  product_id  BIGINT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE swap_requests (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id  BIGINT UNSIGNED NOT NULL,
  buyer_id    BIGINT UNSIGNED NOT NULL,
  seller_id   BIGINT UNSIGNED NOT NULL,
  swap_for    VARCHAR(255) NULL,
  message     TEXT NULL,
  status      ENUM('pending','accepted','declined','cancelled','completed') NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_swap_buyer (buyer_id),
  INDEX idx_swap_seller (seller_id),
  INDEX idx_swap_status (status)
) ENGINE=InnoDB;

-- =========================================================
-- REVIEWS (product + seller)
-- =========================================================
CREATE TABLE reviews (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id      BIGINT UNSIGNED NOT NULL,
  reviewer_id     BIGINT UNSIGNED NULL,
  reviewer_name   VARCHAR(150) NOT NULL,
  product_rating  TINYINT UNSIGNED NULL CHECK (product_rating BETWEEN 1 AND 5),
  seller_rating   TINYINT UNSIGNED NULL CHECK (seller_rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_reviews_product (product_id)
) ENGINE=InnoDB;

-- =========================================================
-- ORDERS / PAYMENTS
-- =========================================================
CREATE TABLE orders (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_reference  VARCHAR(50) NOT NULL UNIQUE,
  buyer_id         BIGINT UNSIGNED NOT NULL,
  seller_id        BIGINT UNSIGNED NULL,
  total_amount     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status           ENUM('pending_payment','paid','processing','ready_for_collection','completed','cancelled','refunded') NOT NULL DEFAULT 'pending_payment',
  payment_status   ENUM('pending','complete','failed','refunded') NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_orders_buyer (buyer_id),
  INDEX idx_orders_seller (seller_id),
  INDEX idx_orders_status (status)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id    BIGINT UNSIGNED NOT NULL,
  product_id  BIGINT UNSIGNED NOT NULL,
  seller_id   BIGINT UNSIGNED NOT NULL,
  quantity    INT UNSIGNED NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL,
  subtotal    DECIMAL(10,2) AS (quantity * unit_price) STORED,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB;

CREATE TABLE payments (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id            BIGINT UNSIGNED NOT NULL,
  provider            VARCHAR(50) NOT NULL DEFAULT 'ozow',
  provider_reference  VARCHAR(150) NULL,
  amount              DECIMAL(10,2) NOT NULL,
  status              ENUM('pending','complete','failed','refunded','released') NOT NULL DEFAULT 'pending',
  paid_at             TIMESTAMP NULL,
  released_at         TIMESTAMP NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_payments_order (order_id)
) ENGINE=InnoDB;

-- =========================================================
-- SAFEHOME SERVICE TYPES / REQUESTS
-- =========================================================
CREATE TABLE service_types (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE services (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id          BIGINT UNSIGNED NOT NULL,
  service_provider_id BIGINT UNSIGNED NULL,
  service_type_id     INT UNSIGNED NOT NULL,
  title               VARCHAR(200) NOT NULL,
  description         TEXT NOT NULL,
  residence_name      VARCHAR(200) NOT NULL,
  room_number         VARCHAR(80) NULL,
  photo_url           VARCHAR(500) NULL,
  priority            ENUM('normal','medium','high','emergency') NOT NULL DEFAULT 'normal',
  status              ENUM('pending','assigned','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  estimated_cost      DECIMAL(10,2) NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (service_provider_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (service_type_id) REFERENCES service_types(id) ON DELETE RESTRICT,
  INDEX idx_services_student (student_id),
  INDEX idx_services_provider (service_provider_id),
  INDEX idx_services_type (service_type_id),
  INDEX idx_services_status_priority (status, priority)
) ENGINE=InnoDB;

INSERT INTO service_types (name, description) VALUES
  ('Emergency Plumbing', 'Urgent leaks, blocked drains and plumbing failures.'),
  ('Emergency Electrical', 'Urgent electrical faults and power failures.'),
  ('Locksmith', 'Urgent lockout and access assistance.'),
  ('Security', 'Urgent residence security assistance.'),
  ('Plumbing', 'General plumbing repairs.'),
  ('Electrical', 'General electrical repairs.'),
  ('Cleaning', 'Residence cleaning services.'),
  ('Handyman', 'General maintenance and repairs.');

-- =========================================================
-- SERVICE PROVIDERS / JOBS
-- =========================================================
CREATE TABLE service_provider_profiles (
  user_id             BIGINT UNSIGNED PRIMARY KEY,
  business_name       VARCHAR(200) NULL,
  service_type        VARCHAR(150) NOT NULL,
  bio                 TEXT NULL,
  location            VARCHAR(200) NULL,
  hourly_rate         DECIMAL(10,2) NULL,
  rating              DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  total_reviews       INT UNSIGNED NOT NULL DEFAULT 0,
  accepts_emergency   BOOLEAN NOT NULL DEFAULT TRUE,
  verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE jobs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id     BIGINT UNSIGNED NOT NULL,
  provider_id   BIGINT UNSIGNED NULL,
  title         VARCHAR(200) NOT NULL,
  description   TEXT NULL,
  date          DATE NOT NULL,
  start_time    TIME NULL,
  end_time      TIME NULL,
  location      VARCHAR(255) NULL,
  duration      VARCHAR(100) NULL,
  requirements  TEXT NULL,
  pay           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status        ENUM('available','accepted','scheduled','completed','cancelled') NOT NULL DEFAULT 'available',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_jobs_provider (provider_id),
  INDEX idx_jobs_status (status),
  INDEX idx_jobs_date (date)
) ENGINE=InnoDB;

CREATE TABLE job_applications (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id       BIGINT UNSIGNED NOT NULL,
  provider_id  BIGINT UNSIGNED NOT NULL,
  status       ENUM('pending','accepted','declined','withdrawn') NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_job_provider (job_id, provider_id),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE job_reviews (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id       BIGINT UNSIGNED NOT NULL,
  reviewer_id  BIGINT UNSIGNED NOT NULL,
  provider_id  BIGINT UNSIGNED NOT NULL,
  rating       TINYINT UNSIGNED NOT NULL,
  comment      TEXT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (rating BETWEEN 1 AND 5),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- RESIDENCE
-- =========================================================
CREATE TABLE residences (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  manager_id       BIGINT UNSIGNED NULL,
  name             VARCHAR(200) NOT NULL,
  location         VARCHAR(200) NOT NULL,
  rooms_available  INT UNSIGNED NOT NULL DEFAULT 0,
  monthly_price    DECIMAL(10,2) NOT NULL,
  description      TEXT NULL,
  status           ENUM('active','inactive') NOT NULL DEFAULT 'active',
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_residences_location (location)
) ENGINE=InnoDB;

CREATE TABLE residence_requests (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  residence_id  BIGINT UNSIGNED NOT NULL,
  student_id    BIGINT UNSIGNED NOT NULL,
  requested_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status        ENUM('pending','approved','declined','cancelled') NOT NULL DEFAULT 'pending',
  notes         TEXT NULL,
  FOREIGN KEY (residence_id) REFERENCES residences(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_res_request_student (student_id),
  INDEX idx_res_request_status (status)
) ENGINE=InnoDB;

CREATE TABLE residence_payments (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  residence_id  BIGINT UNSIGNED NOT NULL,
  student_id    BIGINT UNSIGNED NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  due_date      DATE NOT NULL,
  paid_at       TIMESTAMP NULL,
  status        ENUM('upcoming','pending','paid','late','extended') NOT NULL DEFAULT 'upcoming',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (residence_id) REFERENCES residences(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_res_payment_student (student_id),
  INDEX idx_res_payment_status (status)
) ENGINE=InnoDB;

-- =========================================================
-- NOTIFICATIONS / SAFETY
-- =========================================================
CREATE TABLE notifications (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  type        VARCHAR(80) NOT NULL,
  title       VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  action_url  VARCHAR(500) NULL,
  metadata    JSON NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_read (user_id, is_read)
) ENGINE=InnoDB;

CREATE TABLE reports (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reporter_id       BIGINT UNSIGNED NOT NULL,
  reported_user_id  BIGINT UNSIGNED NULL,
  product_id        BIGINT UNSIGNED NULL,
  reason            VARCHAR(150) NOT NULL,
  description       TEXT NULL,
  status            ENUM('open','reviewing','resolved','dismissed') NOT NULL DEFAULT 'open',
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at       TIMESTAMP NULL,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_reports_status (status)
) ENGINE=InnoDB;

CREATE TABLE safehome_reports (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        BIGINT UNSIGNED NOT NULL,
  incident_type  VARCHAR(100) NOT NULL,
  description    TEXT NULL,
  location       VARCHAR(255) NULL,
  status         ENUM('open','reviewing','closed') NOT NULL DEFAULT 'open',
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- PREMIUM / ADVERTISING
-- =========================================================
CREATE TABLE subscriptions (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  plan        VARCHAR(80) NOT NULL,
  status      ENUM('active','cancelled','expired','pending') NOT NULL DEFAULT 'active',
  started_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_subscriptions_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE advertisements (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_by   BIGINT UNSIGNED NOT NULL,
  title        VARCHAR(200) NOT NULL,
  description  TEXT NULL,
  image_url    VARCHAR(500) NULL,
  target_url   VARCHAR(500) NULL,
  status       ENUM('draft','pending','active','paused','expired','rejected') NOT NULL DEFAULT 'draft',
  starts_at    DATETIME NULL,
  ends_at      DATETIME NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- STARTER DATA
-- =========================================================

-- Universities (no duplicates)
INSERT INTO universities (name) VALUES
  ('University of Cape Town (UCT)'),
  ('Wits'),
  ('Stellenbosch');

-- Marketplace seller used by the starter listings
INSERT INTO users (full_name, email, password_hash, role, student_number, university_id)
VALUES
  ('CampusSwap Seller', 'seller@campusswap.local', 'password', 'student', 'CS-SELLER-001',
   (SELECT id FROM universities WHERE name = 'University of Cape Town (UCT)'));

-- Categories (no duplicates)
INSERT INTO categories (name, description) VALUES
  ('Books & Textbooks', 'Academic books and textbooks'),
  ('Electronics', 'Laptops, tablets, phones and accessories'),
  ('Furniture', 'Desks, chairs and residence furniture'),
  ('Clothing', 'Clothing and fashion items'),
  ('Stationery', 'Stationery and study supplies'),
  ('Other', 'Other student marketplace items');

-- Marketplace starter listings
INSERT INTO products
  (seller_id, category_id, university_id, listing_type, name, description, price,
   condition_label, condition_status, image_url, location, status)
VALUES
  ((SELECT id FROM users WHERE email = 'seller@campusswap.local'),
   (SELECT id FROM categories WHERE name = 'Books & Textbooks'),
   (SELECT id FROM universities WHERE name = 'University of Cape Town (UCT)'),
   'sale', 'Introduction to Computer Science Textbook',
   ' lightly used textbook in good condition.', 350.00, 'Good', 'good',
   'https://placehold.co/600x400?text=Textbook', 'UCT Upper Campus', 'active'),
  ((SELECT id FROM users WHERE email = 'seller@campusswap.local'),
   (SELECT id FROM categories WHERE name = 'Electronics'),
   (SELECT id FROM universities WHERE name = 'University of Cape Town (UCT)'),
   'sale', 'Wireless Keyboard',
   'Compact wireless keyboard suitable for study spaces.', 250.00, 'Like new', 'like_new',
   'https://placehold.co/600x400?text=Keyboard', 'UCT Upper Campus', 'active'),
  ((SELECT id FROM users WHERE email = 'seller@campusswap.local'),
   (SELECT id FROM categories WHERE name = 'Furniture'),
   (SELECT id FROM universities WHERE name = 'Wits'),
   'sale', 'Study Desk',
   'Sturdy desk suitable for a student residence.', 800.00, 'Good', 'good',
   'https://placehold.co/600x400?text=Study+Desk', 'Wits Braamfontein', 'active');

-- Residences (no duplicates)
INSERT INTO residences (name, location, rooms_available, monthly_price, description)
VALUES
  ('Claremont House',    'Claremont',   3, 3900.00, 'Student accommodation'),
  ('Mowbray Residence',  'Mowbray',     9, 3600.00, 'Student accommodation'),
  ('Observatory Lodge',  'Observatory', 2, 4500.00, 'Student accommodation');

-- =========================================================
-- Verification
-- =========================================================
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'CampusSwap'
ORDER BY TABLE_NAME;