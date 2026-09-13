CREATE SCHEMA  `campus_swap_project` ;
USE `campus_swap_project` ;

-- 1. UNIVERSITIES - all
CREATE TABLE universities (
  id          INT AUTO_INCREMENT,
  name        VARCHAR(150) NOT NULL UNIQUE,
  province    VARCHAR(50) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- 2. CATEGORIES
CREATE TABLE categories (
  id          INT AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL UNIQUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- 3. USERS
CREATE TABLE users (
  id              INT AUTO_INCREMENT,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(150) NOT NULL,
  student_number  VARCHAR(50) NULL,
  role            ENUM('student', 'service_provider', 'res_manager', 'admin') NOT NULL DEFAULT 'student',
  university_id   INT NULL,
  phone           VARCHAR(20) NULL,
  rating          DECIMAL(2,1) DEFAULT 0.0,
  rating_count    INT DEFAULT 0,
  is_verified     BOOLEAN DEFAULT FALSE,
  is_banned       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_users_university FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL
);

-- 4. PRODUCTS
CREATE TABLE products (
  id              INT AUTO_INCREMENT,
  seller_id       INT NOT NULL,
  category_id     INT NOT NULL,
  university_id   INT NULL,
  course_code     VARCHAR(50) NULL,
  listing_type    ENUM('sell', 'rent', 'swap') NOT NULL DEFAULT 'sell',
  name            VARCHAR(200) NOT NULL,
  author          VARCHAR(150) NULL,
  description     TEXT NULL,
  price           DECIMAL(10,2) NULL,
  rent_period     ENUM('week', 'month') NULL,
  swap_for        VARCHAR(255) NULL,
  condition_label VARCHAR(50) NOT NULL DEFAULT 'Good',
  condition_class VARCHAR(20) NULL DEFAULT '',
  image_url       VARCHAR(255) NULL,
  rating          DECIMAL(2,1) DEFAULT 0.0,
  sales           INT DEFAULT 0,
  is_digital      BOOLEAN DEFAULT FALSE,
  download_url    VARCHAR(255) NULL,
  is_available    BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_products_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_products_university FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL,
  INDEX idx_listing_type (listing_type),
  INDEX idx_university (university_id),
  INDEX idx_price (price)
);

-- 5. SERVICES
CREATE TABLE services (
  id                   INT AUTO_INCREMENT,
  student_id           INT NOT NULL,
  service_provider_id  INT NULL,
  title                VARCHAR(255) NOT NULL,
  description          TEXT NULL,
  issue_type           VARCHAR(100) NOT NULL,
  residence_name       VARCHAR(150) NOT NULL,
  room_number          VARCHAR(50) NOT NULL,
  status               ENUM('pending', 'assigned', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  priority             ENUM('low', 'medium', 'high', 'emergency') DEFAULT 'medium',
  estimated_cost       DECIMAL(10,2) NULL,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_services_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_services_provider FOREIGN KEY (service_provider_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 6. SUBSCRIPTIONS
CREATE TABLE subscriptions (
  id            INT AUTO_INCREMENT,
  user_id       INT NOT NULL,
  plan_name     VARCHAR(50) NOT NULL,
  price         DECIMAL(10,2) NOT NULL,
  status        ENUM('active', 'cancelled', 'expired') DEFAULT 'active',
  start_date    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. ORDERS
CREATE TABLE orders (
  id                INT AUTO_INCREMENT,
  user_id           INT NOT NULL,
  product_id        INT NULL,
  service_id        INT NULL,
  order_type        ENUM('product', 'service', 'subscription') NOT NULL,
  total_amount      DECIMAL(10,2) NOT NULL,
  escrow_fee        DECIMAL(10,2) DEFAULT 15.00,
  escrow_released   BOOLEAN DEFAULT FALSE,
  status            ENUM('pending', 'in_escrow', 'completed', 'cancelled') DEFAULT 'pending',
  payment_method    VARCHAR(50) NULL,
  pickup_zone       VARCHAR(255) NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
);

-- 8. REVIEWS
CREATE TABLE reviews (
  id              INT AUTO_INCREMENT,
  product_id      INT NOT NULL,
  reviewer_id     INT NOT NULL,
  product_rating  INT NULL CHECK (product_rating BETWEEN 1 AND 5),
  seller_rating   INT NULL CHECK (seller_rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. REPORTS
CREATE TABLE reports (
  id                INT AUTO_INCREMENT,
  reporter_id       INT NOT NULL,
  reported_user_id  INT NULL,
  product_id        INT NULL,
  reason            VARCHAR(255) NOT NULL,
  details           TEXT NULL,
  status            ENUM('pending', 'reviewed', 'resolved', 'dismissed') DEFAULT 'pending',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_user FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_reports_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- DATA

INSERT INTO universities (name, province) 
VALUES
  ('University of Cape Town (UCT)', 'Western Cape'),
  ('University of the Witwatersrand (Wits)', 'Gauteng'),
  ('Stellenbosch University (SU)', 'Western Cape'),
  ('Cape Peninsula University of Technology (CPUT)', 'Western Cape'),
  ('University of the Western Cape (UWC)', 'Western Cape');

INSERT INTO categories (name) 
VALUES
  ('Textbooks'),
  ('Laptops & Tech'),
  ('Calculators & Lab Gear'),
  ('E-Books & Study Packs'),
  ('Dorm Furniture');

INSERT INTO users (email, password_hash, full_name, student_number, role, university_id, phone, rating, rating_count, is_verified)
VALUES
  -- Admins 
  ('lerato.admin@campusswap.co.za', 'hash_pass_101', 'Lerato Admin', NULL, 'admin', 1, '0711234567', 5.0, 10, TRUE),
  ('zaarah.admin@campusswap.co.za', 'hash_pass_102', 'Zaarah Admin', NULL, 'admin', 1, '0722345678', 5.0, 8, TRUE),
  ('siwaphiwe.admin@campusswap.co.za', 'hash_pass_103', 'Siwaphiwe Admin', NULL, 'admin', 4, '0733456789', 5.0, 5, TRUE),
  ('anela.admin@campusswap.co.za', 'hash_pass_104', 'Anela Admin', NULL, 'admin', 5, '0744567890', 5.0, 6, TRUE),

  -- Residence Managers 
  ('resmanager.uct@campusswap.co.za', 'hash_pass_201', 'Mr. David Khumalo', NULL, 'res_manager', 1, '0812345678', 0.0, 0, TRUE),
  ('resmanager.cput@campusswap.co.za', 'hash_pass_202', 'Mrs. Nomsa Dlamini', NULL, 'res_manager', 4, '0823456789', 0.0, 0, TRUE),
  ('resmanager.uwc@campusswap.co.za', 'hash_pass_203', 'Dr. Pieter van Zyl', NULL, 'res_manager', 5, '0834567890', 0.0, 0, TRUE),

  -- Service Providers (5)
  ('info@capeplumbing.co.za', 'hash_pass_301', 'Cape Town Express Plumbing', NULL, 'service_provider', 1, '0215550101', 4.9, 22, TRUE),
  ('sparks.fix@gmail.com', 'hash_pass_302', 'Sipho Electrical Solutions', NULL, 'service_provider', 1, '0215550102', 4.8, 14, TRUE),
  ('handy.campus@gmail.com', 'hash_pass_303', 'Campus Handy Helpers', NULL, 'service_provider', 4, '0215550103', 4.7, 19, TRUE),
  ('repairs.fast@gmail.com', 'hash_pass_304', 'QuickFix Appliance Repair', NULL, 'service_provider', 4, '0215550104', 4.6, 11, TRUE),
  ('woodwork.pro@gmail.com', 'hash_pass_305', 'Dorm Assembly & Carpentry', NULL, 'service_provider', 5, '0215550105', 4.9, 30, TRUE),

  -- Students
  ('thabo.m@myuct.ac.za', 'hash_pass_401', 'Thabo M.', 'ST1001', 'student', 1, '0711112222', 4.8, 12, TRUE),
  ('aisha.k@wits.ac.za', 'hash_pass_402', 'Aisha K.', 'ST1002', 'student', 2, '0722223333', 4.9, 4, TRUE),
  ('liam.p@sun.ac.za', 'hash_pass_403', 'Liam P.', 'ST1003', 'student', 3, '0733334444', 4.6, 8, TRUE),
  ('naledi.s@myuct.ac.za', 'hash_pass_404', 'Naledi S.', 'ST1004', 'student', 1, '0744445555', 4.7, 2, TRUE),
  ('sipho.d@myuct.ac.za', 'hash_pass_405', 'Sipho D.', 'ST1005', 'student', 1, '0755556666', 4.9, 15, TRUE),
  ('karabo.n@wits.ac.za', 'hash_pass_406', 'Karabo N.', 'ST1006', 'student', 2, '0766667777', 4.4, 6, TRUE),
  ('emma.v@sun.ac.za', 'hash_pass_407', 'Emma V.', 'ST1007', 'student', 3, '0777778888', 4.8, 3, TRUE),
  ('zola.t@myuct.ac.za', 'hash_pass_408', 'Zola T.', 'ST1008', 'student', 1, '0788889999', 4.5, 5, TRUE),
  ('lerato.student@myuct.ac.za', 'hash_pass_409', 'Lerato Student', 'LRT202601', 'student', 1, '0799990000', 5.0, 1, TRUE),
  ('zaarah.student@myuct.ac.za', 'hash_pass_410', 'Zaarah Student', 'ZRH202602', 'student', 1, '0700001111', 4.9, 2, TRUE);

INSERT INTO products 
  (seller_id, category_id, university_id, listing_type, name, description, price, rent_period, swap_for, condition_label, condition_class, image_url, rating, sales)
VALUES
  (13, 2, 1, 'sell', 'HP EliteBook 840 G5', 'Reliable business laptop in great condition, Intel Core i5, 8GB RAM, 256GB SSD.', 4500.00, NULL, NULL, 'Used: Like New', '', 'https://placehold.co/300x200', 4.8, 12),
  (14, 1, 2, 'swap', 'University Physics Book', 'Latest edition prescribed textbook, used for one semester only.', NULL, NULL, 'Organic Chemistry Textbook (any edition)', 'Like New', '', 'https://placehold.co/300x200', 4.8, 4),
  (15, 2, 3, 'rent', 'Anti-Theft Laptop Bag', 'Padded laptop bag with hidden back-panel zip and slash-resistant strap.', 40.00, 'week', NULL, 'Fair Condition', 'fair', 'https://placehold.co/300x200', 4.8, 8),
  (16, 2, 1, 'sell', 'Sony ANC Headphones', 'Sony noise-cancelling over-ear headphones, comes with original case.', 1800.00, NULL, NULL, 'Like New', '', 'https://placehold.co/300x200', 4.8, 2),
  (17, 3, 1, 'sell', 'Casio Scientific Calculator FX-991', 'Standard-issue engineering/science calculator, exam-approved.', 220.00, NULL, NULL, 'Like New', '', 'https://placehold.co/300x200', 4.9, 15),
  (18, 5, 2, 'sell', 'Desk Lamp with USB Port', 'LED desk lamp with three brightness settings and built-in USB charging port.', 180.00, NULL, NULL, 'Fair Condition', 'fair', 'https://placehold.co/300x200', 4.5, 6),
  (19, 1, 3, 'sell', 'Organic Chemistry Textbook', 'Prescribed organic chemistry textbook, current edition.', 550.00, NULL, NULL, 'Used: Like New', '', 'https://placehold.co/300x200', 4.7, 3),
  (20, 5, 1, 'rent', 'Mini Bar Fridge', 'Compact bar fridge, perfect size for a res room.', 120.00, 'month', NULL, 'Fair Condition', 'fair', 'https://placehold.co/300x200', 4.3, 5);

INSERT INTO services (student_id, service_provider_id, title, description, issue_type, residence_name, room_number, status, priority, estimated_cost) VALUES
  (21, 8, 'Leaking Kitchen Tap', 'Hot water tap won t close fully.', 'Plumbing', 'Smuts Hall', 'Room 302', 'assigned', 'medium', 250.00),
  (22, 9, 'Tripped Circuit Breaker', 'Power lost after plugging in kettle.', 'Electrical', 'Fuller Hall', 'Room 114', 'pending', 'high', 180.00);

INSERT INTO subscriptions (user_id, plan_name, price, status) VALUES
  (21, 'Student Pro', 99.00, 'active'),
  (22, 'Basic Pass', 49.00, 'active');

INSERT INTO orders (user_id, product_id, service_id, order_type, total_amount, escrow_fee, escrow_released, status, payment_method, pickup_zone) VALUES
  (21, 1, NULL, 'product', 4515.00, 15.00, FALSE, 'in_escrow', 'Ozow Instant EFT', 'UCT - Sarah Baartman Safe Zone');

INSERT INTO reviews (product_id, reviewer_id, product_rating, seller_rating, comment) VALUES
  (1, 21, 5, 5, 'Great laptop, exactly as described! Excellent communication.'),
  (5, 22, 5, 5, 'Quick pickup at the campus safe zone. Calculator works perfectly.');

INSERT INTO reports (reporter_id, reported_user_id, product_id, reason, details, status) VALUES
  (21, 14, 2, 'Off-Platform Request', 'Seller asked to handle payment outside CampusSwap.', 'pending');