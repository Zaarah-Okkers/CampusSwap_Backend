CREATE SCHEMA `campus_swap_project`;
USE `campus_swap_project`;

-- 1. UNIVERSITIES
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
  id               INT AUTO_INCREMENT,
  email            VARCHAR(255) NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  full_name        VARCHAR(150) NOT NULL,
  student_number   VARCHAR(50) NULL,
  role ENUM(
    'student',
    'service_provider',
    'res_manager',
    'admin'
  ) NOT NULL DEFAULT 'student',
  university_id    INT NULL,
  phone            VARCHAR(20) NULL,
  bio              TEXT NULL,
  experience_years INT NULL,
  service_area     VARCHAR(255) NULL,
  rating           DECIMAL(2,1) DEFAULT 0.0,
  rating_count     INT DEFAULT 0,
  is_verified      BOOLEAN DEFAULT FALSE,
  is_banned        BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                   ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_users_university
    FOREIGN KEY (university_id)
    REFERENCES universities(id)
    ON DELETE SET NULL
);

-- 4. SERVICE TYPES
CREATE TABLE service_types (
  id          INT AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NULL,
  PRIMARY KEY (id)
);

-- 5. PROVIDER SERVICES
CREATE TABLE provider_services (
  provider_id     INT NOT NULL,
  service_type_id INT NOT NULL,
  PRIMARY KEY (provider_id, service_type_id),
  CONSTRAINT fk_provider_services_provider
    FOREIGN KEY (provider_id)
    REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_provider_services_type
    FOREIGN KEY (service_type_id)
    REFERENCES service_types(id)
    ON DELETE CASCADE
);

-- 6. PRODUCTS
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
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                  ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_products_seller
    FOREIGN KEY (seller_id)
    REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id)
    REFERENCES categories(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_products_university
    FOREIGN KEY (university_id)
    REFERENCES universities(id)
    ON DELETE SET NULL,
  INDEX idx_listing_type (listing_type),
  INDEX idx_university (university_id),
  INDEX idx_price (price)
);

-- 7. SERVICES / SERVICE REQUESTS
CREATE TABLE services (
  id                   INT AUTO_INCREMENT,
  student_id           INT NOT NULL,
  service_provider_id  INT NULL,
  service_type_id      INT NOT NULL,
  title                VARCHAR(255) NOT NULL,
  description          TEXT NULL,
  residence_name       VARCHAR(150) NOT NULL,
  room_number          VARCHAR(50) NOT NULL,
  photo_url            VARCHAR(255) NULL,
  status ENUM(
    'pending',
    'assigned',
    'in_progress',
    'completed',
    'cancelled'
  ) DEFAULT 'pending',
  priority ENUM(
    'low',
    'medium',
    'high',
    'emergency'
  ) DEFAULT 'medium',
  estimated_cost       DECIMAL(10,2) NULL,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_services_student
    FOREIGN KEY (student_id)
    REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_services_provider
    FOREIGN KEY (service_provider_id)
    REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_services_type
    FOREIGN KEY (service_type_id)
    REFERENCES service_types(id)
    ON DELETE RESTRICT
);

-- 8. SUBSCRIPTIONS
CREATE TABLE subscriptions (
  id            INT AUTO_INCREMENT,
  user_id       INT NOT NULL,
  plan_name     VARCHAR(50) NOT NULL,
  price         DECIMAL(10,2) NOT NULL,
  status ENUM(
    'active',
    'cancelled',
    'expired'
  ) DEFAULT 'active',
  start_date    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_subscriptions_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- 9. ORDERS
CREATE TABLE orders (
  id                INT AUTO_INCREMENT,
  user_id           INT NOT NULL,
  product_id        INT NULL,
  service_id        INT NULL,
  order_type ENUM(
    'product',
    'service',
    'subscription'
  ) NOT NULL,
  total_amount      DECIMAL(10,2) NOT NULL,
  escrow_fee        DECIMAL(10,2) DEFAULT 15.00,
  escrow_released   BOOLEAN DEFAULT FALSE,
  status ENUM(
    'pending',
    'in_escrow',
    'completed',
    'cancelled'
  ) DEFAULT 'pending',
  payment_method    VARCHAR(50) NULL,
  pickup_zone       VARCHAR(255) NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_orders_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_orders_service
    FOREIGN KEY (service_id)
    REFERENCES services(id)
    ON DELETE SET NULL
);

-- 10. REVIEWS
CREATE TABLE reviews (
  id              INT AUTO_INCREMENT,
  product_id      INT NOT NULL,
  reviewer_id     INT NOT NULL,
  product_rating  INT NULL CHECK (product_rating BETWEEN 1 AND 5),
  seller_rating   INT NULL CHECK (seller_rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_reviews_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reviews_reviewer
    FOREIGN KEY (reviewer_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- 11. REPORTS
CREATE TABLE reports (
  id                INT AUTO_INCREMENT,
  reporter_id       INT NOT NULL,
  reported_user_id  INT NULL,
  product_id        INT NULL,
  reason            VARCHAR(255) NOT NULL,
  details           TEXT NULL,
  status ENUM(
    'pending',
    'reviewed',
    'resolved',
    'dismissed'
  ) DEFAULT 'pending',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_reports_reporter
    FOREIGN KEY (reporter_id)
    REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reports_user
    FOREIGN KEY (reported_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_reports_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE SET NULL
);

-- ============================================================
-- DATA
-- ============================================================

-- UNIVERSITIES: 
INSERT INTO universities (name, province) VALUES
  ('University of Cape Town (UCT)', 'Western Cape'),
  ('University of the Witwatersrand (Wits)', 'Gauteng'),
  ('Stellenbosch University (SU)', 'Western Cape'),
  ('Cape Peninsula University of Technology (CPUT)', 'Western Cape'),
  ('University of the Western Cape (UWC)', 'Western Cape'),
  ('University of South Africa (UNISA) Cape Town Branch', 'Western Cape'),
  ('University of Pretoria (UP)', 'Gauteng'),
  ('University of Johannesburg (UJ)', 'Gauteng'),
  ('Tshwane University of Technology (TUT)', 'Gauteng'),
  ('University of South Africa (UNISA) main branch', 'Gauteng'),
  ('University of KwaZulu-Natal (UKZN)', 'KwaZulu-Natal'),
  ('Durban University of Technology (DUT)', 'KwaZulu-Natal'),
  ('Mangosuthu University of Technology (MUT)', 'KwaZulu-Natal'),
  ('Rhodes University', 'Eastern Cape'),
  ('Nelson Mandela University (NMU)', 'Eastern Cape'),
  ('Walter Sisulu University (WSU)', 'Eastern Cape'),
  ('University of the Free State (UFS)', 'Free State'),
  ('Central University of Technology (CUT)', 'Free State'),
  ('North-West University (NWU)', 'North West'),
  ('University of Limpopo (UL)', 'Limpopo'),
  ('University of Venda (UNIVEN)', 'Limpopo'),
  ('University of Mpumalanga (UMP)', 'Mpumalanga'),
  ('Sol Plaatje University (SPU)', 'Northern Cape');

-- CATEGORIES
INSERT INTO categories (name) VALUES
  ('Textbooks'),
  ('Laptops & Tech'),
  ('Calculators & Lab Gear'),
  ('E-Books & Study Packs'),
  ('Dorm Furniture');

-- SERVICE TYPES
INSERT INTO service_types (name, description) VALUES
  ('Plumbing',   'Water leaks, taps, pipes, toilets and plumbing repairs.'),
  ('Electrical', 'Electrical faults, plugs, lights, breakers and wiring.'),
  ('Cleaning',   'Residential and student accommodation cleaning services.'),
  ('Gardening',  'Garden maintenance, landscaping and outdoor cleaning.'),
  ('Security',   'Locksmith, security and emergency access services.'),
  ('Handyman',   'General maintenance, repairs and assembly services.');

-- USERS
INSERT INTO users
(email, password_hash, full_name, student_number, role, university_id, phone,
 bio, experience_years, service_area, rating, rating_count, is_verified)
VALUES
  -- Admins
  ('lerato.admin@campusswap.co.za', 'hash_pass_101', 'Lerato Admin', NULL, 'admin', 1, '0711234567', NULL, NULL, NULL, 5.0, 10, TRUE),
  ('zaarah.admin@campusswap.co.za', 'hash_pass_102', 'Zaarah Admin', NULL, 'admin', 1, '0722345678', NULL, NULL, NULL, 5.0, 8, TRUE),
  ('siwaphiwe.admin@campusswap.co.za', 'hash_pass_103', 'Siwaphiwe Admin', NULL, 'admin', 4, '0733456789', NULL, NULL, NULL, 5.0, 5, TRUE),
  ('anela.admin@campusswap.co.za', 'hash_pass_104', 'Anela Admin', NULL, 'admin', 5, '0744567890', NULL, NULL, NULL, 5.0, 6, TRUE),

  -- Residence Managers
  ('resmanager.uct@campusswap.co.za', 'hash_pass_201', 'Mr. David Khumalo', NULL, 'res_manager', 1, '0812345678', NULL, NULL, NULL, 0.0, 0, TRUE),
  ('resmanager.cput@campusswap.co.za', 'hash_pass_202', 'Mrs. Nomsa Dlamini', NULL, 'res_manager', 4, '0823456789', NULL, NULL, NULL, 0.0, 0, TRUE),
  ('resmanager.uwc@campusswap.co.za', 'hash_pass_203', 'Dr. Pieter van Zyl', NULL, 'res_manager', 5, '0834567890', NULL, NULL, NULL, 0.0, 0, TRUE),

  -- Service Providers
  ('info@capeplumbing.co.za', 'hash_pass_301', 'Cape Town Express Plumbing', NULL, 'service_provider', 1, '0215550101', 'Professional plumbing services for student residences and homes.', 8, 'Cape Town', 4.9, 22, TRUE),
  ('sparks.fix@gmail.com', 'hash_pass_302', 'Sipho Electrical Solutions', NULL, 'service_provider', 1, '0215550102', 'Qualified electrical repair and maintenance services.', 7, 'Cape Town', 4.8, 14, TRUE),
  ('handy.campus@gmail.com', 'hash_pass_303', 'Campus Handy Helpers', NULL, 'service_provider', 4, '0215550103', 'General maintenance and handyman services for students.', 6, 'Cape Town', 4.7, 19, TRUE),
  ('repairs.fast@gmail.com', 'hash_pass_304', 'QuickFix Appliance Repair', NULL, 'service_provider', 4, '0215550104', 'Fast appliance repairs and general maintenance.', 5, 'Cape Town', 4.6, 11, TRUE),
  ('woodwork.pro@gmail.com', 'hash_pass_305', 'Dorm Assembly & Carpentry', NULL, 'service_provider', 5, '0215550105', 'Furniture assembly, carpentry and student residence repairs.', 9, 'Cape Town', 4.9, 30, TRUE),

  -- Students
  ('thabo.m@myuct.ac.za', 'hash_pass_401', 'Thabo M.', 'ST1001', 'student', 1, '0711112222', NULL, NULL, NULL, 4.8, 12, TRUE),
  ('aisha.k@wits.ac.za', 'hash_pass_402', 'Aisha K.', 'ST1002', 'student', 2, '0722223333', NULL, NULL, NULL, 4.9, 4, TRUE),
  ('liam.p@sun.ac.za', 'hash_pass_403', 'Liam P.', 'ST1003', 'student', 3, '0733334444', NULL, NULL, NULL, 4.6, 8, TRUE),
  ('naledi.s@myuct.ac.za', 'hash_pass_404', 'Naledi S.', 'ST1004', 'student', 1, '0744445555', NULL, NULL, NULL, 4.7, 2, TRUE),
  ('sipho.d@myuct.ac.za', 'hash_pass_405', 'Sipho D.', 'ST1005', 'student', 1, '0755556666', NULL, NULL, NULL, 4.9, 15, TRUE),
  ('karabo.n@wits.ac.za', 'hash_pass_406', 'Karabo N.', 'ST1006', 'student', 2, '0766667777', NULL, NULL, NULL, 4.4, 6, TRUE),
  ('emma.v@sun.ac.za', 'hash_pass_407', 'Emma V.', 'ST1007', 'student', 3, '0777778888', NULL, NULL, NULL, 4.8, 3, TRUE),
  ('zola.t@myuct.ac.za', 'hash_pass_408', 'Zola T.', 'ST1008', 'student', 1, '0788889999', NULL, NULL, NULL, 4.5, 5, TRUE),
  ('lerato.student@myuct.ac.za', 'hash_pass_409', 'Lerato Student', 'LRT202601', 'student', 1, '0799990000', NULL, NULL, NULL, 5.0, 1, TRUE),
  ('zaarah.student@myuct.ac.za', 'hash_pass_410', 'Zaarah Student', 'ZRH202602', 'student', 1, '0700001111', NULL, NULL, NULL, 4.9, 2, TRUE);

-- PROVIDER → SERVICE TYPE CONNECTIONS
INSERT INTO provider_services (provider_id, service_type_id)
SELECT 8, id FROM service_types WHERE name = 'Plumbing'
UNION ALL
SELECT 9, id FROM service_types WHERE name = 'Electrical'
UNION ALL
SELECT 10, id FROM service_types WHERE name = 'Handyman'
UNION ALL
SELECT 11, id FROM service_types WHERE name = 'Handyman'
UNION ALL
SELECT 12, id FROM service_types WHERE name = 'Handyman';

-- PRODUCTS
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

-- SERVICES
INSERT INTO services
(student_id, service_provider_id, service_type_id, title, description, residence_name, room_number, status, priority, estimated_cost)
VALUES
  (21, 8, (SELECT id FROM service_types WHERE name = 'Plumbing'), 'Leaking Kitchen Tap', 'Hot water tap won t close fully.', 'Smuts Hall', 'Room 302', 'assigned', 'medium', 250.00),
  (22, 9, (SELECT id FROM service_types WHERE name = 'Electrical'), 'Tripped Circuit Breaker', 'Power lost after plugging in kettle.', 'Fuller Hall', 'Room 114', 'pending', 'high', 180.00);

-- SUBSCRIPTIONS
INSERT INTO subscriptions (user_id, plan_name, price, status) VALUES
  (21, 'Student Pro', 99.00, 'active'),
  (22, 'Basic Pass', 49.00, 'active');

-- ORDERS
INSERT INTO orders
(user_id, product_id, service_id, order_type, total_amount, escrow_fee, escrow_released, status, payment_method, pickup_zone)
VALUES
  (21, 1, NULL, 'product', 4515.00, 15.00, FALSE, 'in_escrow', 'Ozow Instant EFT', 'UCT - Sarah Baartman Safe Zone');

-- REVIEWS
INSERT INTO reviews (product_id, reviewer_id, product_rating, seller_rating, comment) VALUES
  (1, 21, 5, 5, 'Great laptop, exactly as described! Excellent communication.'),
  (5, 22, 5, 5, 'Quick pickup at the campus safe zone. Calculator works perfectly.');

-- REPORTS
INSERT INTO reports (reporter_id, reported_user_id, product_id, reason, details, status) VALUES
  (21, 14, 2, 'Off-Platform Request', 'Seller asked to handle payment outside CampusSwap.', 'pending');
  
  --  features near you images
-- 1. HP EliteBook 840 G5 — SELL
UPDATE products SET
  name = 'HP EliteBook 840 G5 (Used)',
  description = 'Intel Core i5, 8GB RAM, 256GB SSD. Great for engineering and commerce students. Comes with charger.',
  price = 650.00,
  listing_type = 'sell',
  rent_period = NULL,
  swap_for = NULL,
  condition_label = 'Used: Good',
  image_url = 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop'
WHERE id = 1;

-- 2. University Physics (Young & Freedman) — RENT
UPDATE products SET
  name = 'University Physics (Young & Freedman)',
  description = 'Prescribed physics textbook available for weekly rental. Perfect for one-semester physics students.',
  price = 80.00,
  listing_type = 'rent',
  rent_period = 'week',
  swap_for = NULL,
  condition_label = 'Used: Like New',
  image_url = 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=300&fit=crop'
WHERE id = 2;

-- 3. Anti-Theft Laptop Backpack — SELL
UPDATE products SET
  name = 'Anti-Theft Laptop Backpack',
  description = 'Fits 15.6" laptops. Hidden zip compartment and USB charging port. Ideal for campus commute.',
  price = 180.00,
  listing_type = 'sell',
  rent_period = NULL,
  swap_for = NULL,
  condition_label = 'Used: Fair',
  image_url = 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop'
WHERE id = 3;

-- 4. Sony WH-CH510 Headphones — SELL
UPDATE products SET
  name = 'Sony WH-CH510 Wireless Headphones',
  description = 'Bluetooth over-ear headphones with 35-hour battery. Perfect for study sessions in the library.',
  price = 450.00,
  listing_type = 'sell',
  rent_period = NULL,
  swap_for = NULL,
  condition_label = 'Used: Like New',
  image_url = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop'
WHERE id = 4;

-- 5. Casio FX-991ES Plus Calculator — SELL
UPDATE products SET
  name = 'Casio FX-991ES Plus Calculator',
  description = 'Exam-approved scientific calculator. Required for engineering, science and accounting courses.',
  price = 250.00,
  listing_type = 'sell',
  rent_period = NULL,
  swap_for = NULL,
  condition_label = 'Used: Like New',
  image_url = 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400&h=300&fit=crop'
WHERE id = 5;

-- 6. LED Desk Lamp — SELL
UPDATE products SET
  name = 'LED Desk Lamp with USB Port',
  description = 'Three brightness settings with built-in USB charging. Perfect for late-night study.',
  price = 120.00,
  listing_type = 'sell',
  rent_period = NULL,
  swap_for = NULL,
  condition_label = 'Used: Fair',
  image_url = 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop'
WHERE id = 6;

-- 7. Organic Chemistry Textbook — SELL
UPDATE products SET
  name = 'Organic Chemistry (Clayden, 2nd Edition)',
  description = 'Prescribed textbook for 2nd and 3rd year chemistry students. Cover shows slight wear.',
  price = 380.00,
  listing_type = 'sell',
  rent_period = NULL,
  swap_for = NULL,
  condition_label = 'Used: Good',
  image_url = 'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=400&h=300&fit=crop'
WHERE id = 7;

-- 8. Mini Bar Fridge — SELL
UPDATE products SET
  name = 'Mini Bar Fridge (46L)',
  description = 'Compact bar fridge fits perfectly in a res room. Energy-efficient and quiet.',
  price = 680.00,
  listing_type = 'sell',
  rent_period = NULL,
  swap_for = NULL,
  condition_label = 'Used: Fair',
  image_url = 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400&h=300&fit=crop'
WHERE id = 8;

-- Verify all 8 products
SELECT id, name, listing_type, price, rent_period, condition_label
FROM products
ORDER BY id;