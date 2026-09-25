CREATE SCHEMA `campusswap`;
USE `campusswap`;

CREATE TABLE universities (
  id          INT AUTO_INCREMENT,
  name        VARCHAR(150) NOT NULL UNIQUE,
  province    VARCHAR(50) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE categories (
  id          INT AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE users (
  id              INT AUTO_INCREMENT,
  email           VARCHAR(150) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(150) NOT NULL,
  student_number  VARCHAR(50)  NULL,
  role            ENUM('student','service_provider','res_manager','admin') NOT NULL DEFAULT 'student',
  university_id   INT NULL,
  phone           VARCHAR(20) NULL,
  rating          DECIMAL(3,2) DEFAULT 0.00,
  rating_count    INT DEFAULT 0,
  is_verified     BOOLEAN DEFAULT FALSE,
  is_banned       BOOLEAN DEFAULT FALSE,
  avatar_url      VARCHAR(500) NULL,
  is_premium      BOOLEAN DEFAULT FALSE,
  online          BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_users_university FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL
);

CREATE TABLE products (
  id               INT AUTO_INCREMENT,
  seller_id        INT NOT NULL,
  category_id      INT NULL,
  university_id    INT NULL,
  course_code      VARCHAR(20) NULL,
  listing_type     ENUM('sale','swap','sale_and_swap','rent') NOT NULL DEFAULT 'sale',
  name             VARCHAR(200) NOT NULL,
  author           VARCHAR(150) NULL,
  description      TEXT NULL,
  price            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  rent_period      VARCHAR(50) NULL,
  swap_for         VARCHAR(255) NULL,
  condition_status ENUM('new','like_new','good','fair','used') NOT NULL DEFAULT 'good',
  image_url        VARCHAR(500) NULL,
  location         VARCHAR(200) NULL,
  rating           DECIMAL(3,2) DEFAULT 0.00,
  sales            INT DEFAULT 0,
  is_digital       BOOLEAN DEFAULT FALSE,
  download_url     VARCHAR(500) NULL,
  status           ENUM('active','reserved','sold','removed') NOT NULL DEFAULT 'active',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_products_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_products_university FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL
);

CREATE TABLE service_types (
  id          INT AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  accepts_emergency TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE provider_services (
  provider_id     INT NOT NULL,
  service_type_id INT NOT NULL,
  PRIMARY KEY (provider_id, service_type_id),
  CONSTRAINT fk_provider_services_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_provider_services_type FOREIGN KEY (service_type_id) REFERENCES service_types(id) ON DELETE CASCADE
);

CREATE TABLE swap_requests (
  id         INT AUTO_INCREMENT,
  product_id INT NOT NULL,
  buyer_id   INT NOT NULL,
  seller_id  INT NOT NULL,
  swap_for   VARCHAR(255) NULL,
  message    TEXT NULL,
  status     ENUM('pending','accepted','declined','cancelled','completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_swap_requests_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_swap_requests_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_swap_requests_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_swap_buyer (buyer_id),
  INDEX idx_swap_seller (seller_id),
  INDEX idx_swap_status (status)
);

CREATE TABLE favorites (
  user_id    INT NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_favorites_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE orders (
  id              INT AUTO_INCREMENT,
  order_reference VARCHAR(50) NOT NULL UNIQUE,
  buyer_id        INT NOT NULL,
  seller_id       INT NOT NULL,
  total_amount    DECIMAL(10,2) NOT NULL,
  status          ENUM('pending','paid','shipped','completed','cancelled','refunded') DEFAULT 'pending',
  payment_status  ENUM('pending','complete','failed','refunded') DEFAULT 'pending',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_orders_buyer (buyer_id),
  INDEX idx_orders_seller (seller_id),
  INDEX idx_orders_status (status)
);

CREATE TABLE order_items (
  id         INT AUTO_INCREMENT,
  order_id   INT NOT NULL,
  product_id INT NOT NULL,
  seller_id  INT NOT NULL,
  quantity   INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal   DECIMAL(10,2) AS (quantity * unit_price) STORED,
  PRIMARY KEY (id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_order_items_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_order_items_order (order_id)
);

CREATE TABLE reports (
  id               INT AUTO_INCREMENT,
  reporter_id      INT NOT NULL,
  reported_user_id INT NULL,
  product_id       INT NULL,
  reason           VARCHAR(255) NOT NULL,
  details          TEXT NULL,
  status           ENUM('pending','reviewed','resolved','dismissed') DEFAULT 'pending',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_reported_user FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_reports_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE payments (
  id                 INT AUTO_INCREMENT,
  order_id           INT NOT NULL,
  provider           VARCHAR(50) NOT NULL DEFAULT 'ozow',
  provider_reference VARCHAR(150) NULL,
  amount             DECIMAL(10,2) NOT NULL,
  status             ENUM('pending','complete','failed','refunded','released') DEFAULT 'pending',
  paid_at            TIMESTAMP NULL,
  released_at        TIMESTAMP NULL,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_payments_order (order_id)
);

CREATE TABLE reviews (
  id             INT AUTO_INCREMENT,
  product_id     INT NOT NULL,
  reviewer_id    INT NOT NULL,
  reviewer_name  VARCHAR(150) NULL,
  product_rating INT NOT NULL CHECK (product_rating BETWEEN 1 AND 5),
  seller_rating  INT NULL CHECK (seller_rating BETWEEN 1 AND 5),
  comment        TEXT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE service_provider_profiles (
  user_id             INT PRIMARY KEY,
  business_name       VARCHAR(200) NULL,
  service_type        VARCHAR(150) NULL,
  bio                 TEXT NULL,
  location            VARCHAR(200) NULL,
  experience_years    INT NULL,
  service_area        VARCHAR(255) NULL,
  company             VARCHAR(200) NULL,
  hourly_rate         DECIMAL(10,2) NULL,
  rating              DECIMAL(3,2) DEFAULT 0.00,
  total_reviews       INT DEFAULT 0,
  verification_status ENUM('pending','verified','rejected') DEFAULT 'pending',
  accepts_emergency   TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_provider_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  service_provider_id INT NULL,
  service_type_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  residence_name VARCHAR(180) NOT NULL,
  room_number VARCHAR(60) NULL,
  photo_url VARCHAR(500) NULL,
  status ENUM('pending','quoted','approved','declined','assigned','in_progress','completed','paid','cancelled')
    NOT NULL DEFAULT 'pending',
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

CREATE TABLE residences (
  id              INT AUTO_INCREMENT,
  manager_id      INT NULL,
  name            VARCHAR(200) NOT NULL,
  location        VARCHAR(200) NOT NULL,
  rooms_available INT NOT NULL DEFAULT 0,
  monthly_price   DECIMAL(10,2) NOT NULL,
  description     TEXT NULL,
  status          ENUM('active','inactive') DEFAULT 'active',
  PRIMARY KEY (id),
  CONSTRAINT fk_residences_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_residences_location (location)
);

CREATE TABLE residence_requests (
  id           INT AUTO_INCREMENT,
  residence_id INT NOT NULL,
  student_id   INT NOT NULL,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status       ENUM('pending','approved','declined','cancelled') DEFAULT 'pending',
  notes        TEXT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_residence_requests_residence FOREIGN KEY (residence_id) REFERENCES residences(id) ON DELETE CASCADE,
  CONSTRAINT fk_residence_requests_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_res_request_student (student_id),
  INDEX idx_res_request_status (status)
);

CREATE TABLE residence_payments (
  id           INT AUTO_INCREMENT,
  residence_id INT NOT NULL,
  student_id   INT NOT NULL,
  amount       DECIMAL(10,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  due_date     DATE NOT NULL,
  paid_at      TIMESTAMP NULL,
  status       ENUM('upcoming','pending','paid','late','extended') DEFAULT 'upcoming',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_residence_payments_residence FOREIGN KEY (residence_id) REFERENCES residences(id) ON DELETE CASCADE,
  CONSTRAINT fk_residence_payments_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_res_payment_student (student_id),
  INDEX idx_res_payment_status (status)
);

CREATE TABLE notifications (
  id         INT AUTO_INCREMENT,
  user_id    INT NOT NULL,
  type       VARCHAR(80) NOT NULL,
  title      VARCHAR(200) NOT NULL,
  message    TEXT NOT NULL,
  action_url VARCHAR(500) NULL,
  metadata   JSON NULL,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_read (user_id, is_read)
);

CREATE TABLE safehome_reports (
  id            INT AUTO_INCREMENT,
  user_id       INT NOT NULL,
  incident_type VARCHAR(100) NOT NULL,
  description   TEXT NULL,
  location      VARCHAR(255) NULL,
  status        ENUM('open','reviewing','closed') DEFAULT 'open',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_safehome_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE advertisements (
  id          INT AUTO_INCREMENT,
  created_by  INT NOT NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT NULL,
  image_url   VARCHAR(500) NULL,
  target_url  VARCHAR(500) NULL,
  status      ENUM('draft','pending','active','paused','expired','rejected') DEFAULT 'draft',
  starts_at   DATETIME NULL,
  ends_at     DATETIME NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_advertisements_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE subscriptions (
  id         INT AUTO_INCREMENT,
  user_id    INT NOT NULL,
  plan       VARCHAR(50) NOT NULL,
  status     ENUM('active','cancelled','expired','pending') DEFAULT 'active',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE service_reviews (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  service_id   INT NOT NULL,
  student_id   INT NOT NULL,
  provider_id  INT NOT NULL,
  rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sr_service  FOREIGN KEY (service_id)  REFERENCES services(id) ON DELETE CASCADE,
  CONSTRAINT fk_sr_student  FOREIGN KEY (student_id)  REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_sr_provider FOREIGN KEY (provider_id) REFERENCES users(id)    ON DELETE CASCADE,
  UNIQUE KEY one_review_per_service (service_id),
  INDEX idx_sr_provider (provider_id)
);

CREATE TABLE books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  author VARCHAR(200) NULL,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  size VARCHAR(50) NULL,
  module VARCHAR(20) NULL,
  format ENUM('ebook','audiobook','guide') NOT NULL DEFAULT 'ebook',
  cover_url VARCHAR(500) NULL,
  seller_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_books_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- SEED DATA
-- ============================================================

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

INSERT INTO categories (name, description) VALUES
  ('Books & Textbooks', 'Academic books and textbooks'),
  ('Electronics',       'Laptops, tablets, phones and accessories'),
  ('Furniture',         'Desks, chairs and residence furniture'),
  ('Clothing',          'Clothing and fashion items'),
  ('Stationery',        'Stationery and study supplies'),
  ('Other',             'Other student marketplace items');

INSERT INTO users (email, password_hash, full_name, student_number, role, university_id, phone, rating, rating_count, is_verified) VALUES
  ('lerato.admin@campusswap.co.za',     'admin123',    'Lerato Admin',              NULL,           'admin',            1, '0711234567', 5.0, 10, TRUE),
  ('zaarah.admin@campusswap.co.za',     'admin123',    'Zaarah Admin',              NULL,           'admin',            1, '0722345678', 5.0,  8, TRUE),
  ('siwaphiwe.admin@campusswap.co.za',  'admin123',    'Siwaphiwe Admin',           NULL,           'admin',            4, '0733456789', 5.0,  5, TRUE),
  ('anela.admin@campusswap.co.za',      'admin123',    'Anela Admin',               NULL,           'admin',            5, '0744567890', 5.0,  6, TRUE),
  ('resmanager.uct@campusswap.co.za',   'res123',      'Mr. David Khumalo',         NULL,           'res_manager',      1, '0812345678', 0.0,  0, TRUE),
  ('resmanager.cput@campusswap.co.za',  'res123',      'Mrs. Nomsa Dlamini',        NULL,           'res_manager',      4, '0823456789', 0.0,  0, TRUE),
  ('resmanager.uwc@campusswap.co.za',   'res123',      'Dr. Pieter van Zyl',        NULL,           'res_manager',      5, '0834567890', 0.0,  0, TRUE),
  ('info@capeplumbing.co.za',           'provider123', 'Cape Town Express Plumbing',NULL,           'service_provider', 1, '0215550101', 4.9, 22, TRUE),
  ('sparks.fix@gmail.com',              'provider123', 'Sipho Electrical Solutions',NULL,           'service_provider', 1, '0215550102', 4.8, 14, TRUE),
  ('handy.campus@gmail.com',            'provider123', 'Campus Handy Helpers',      NULL,           'service_provider', 4, '0215550103', 4.7, 19, TRUE),
  ('repairs.fast@gmail.com',            'provider123', 'QuickFix Appliance Repair', NULL,           'service_provider', 4, '0215550104', 4.6, 11, TRUE),
  ('woodwork.pro@gmail.com',            'provider123', 'Dorm Assembly & Carpentry', NULL,           'service_provider', 5, '0215550105', 4.9, 30, TRUE),
  ('thabo.m@myuct.ac.za',               'student123',  'Thabo M.',                  'ST1001',       'student',          1, '0711112222', 4.8, 12, TRUE),
  ('aisha.k@wits.ac.za',                'student123',  'Aisha K.',                  'ST1002',       'student',          2, '0722223333', 4.9,  4, TRUE),
  ('liam.p@sun.ac.za',                  'student123',  'Liam P.',                   'ST1003',       'student',          3, '0733334444', 4.6,  8, TRUE),
  ('naledi.s@myuct.ac.za',              'student123',  'Naledi S.',                 'ST1004',       'student',          1, '0744445555', 4.7,  2, TRUE),
  ('sipho.d@myuct.ac.za',               'student123',  'Sipho D.',                  'ST1005',       'student',          1, '0755556666', 4.9, 15, TRUE),
  ('karabo.n@wits.ac.za',               'student123',  'Karabo N.',                 'ST1006',       'student',          2, '0766667777', 4.4,  6, TRUE),
  ('emma.v@sun.ac.za',                  'student123',  'Emma V.',                   'ST1007',       'student',          3, '0777778888', 4.8,  3, TRUE),
  ('zola.t@myuct.ac.za',                'student123',  'Zola T.',                   'ST1008',       'student',          1, '0788889999', 4.5,  5, TRUE),
  ('lerato.student@myuct.ac.za',        'student123',  'Lerato Student',            'LRT202601',    'student',          1, '0799990000', 5.0,  1, TRUE),
  ('zaarah.student@myuct.ac.za',        'student123',  'Zaarah Student',            'ZRH202602',    'student',          1, '0700001111', 4.9,  2, TRUE),
  ('seller@campusswap.local',           'seller123',   'CampusSwap Seller',         'CS-SELLER-001','student',          1, NULL,         0.0,  0, FALSE);

-- 16 products 
INSERT INTO products
  (seller_id, category_id, university_id, listing_type, name, description,
   price, rent_period, swap_for, condition_status, image_url, location, rating, sales, status)
VALUES
  (13, 2, 1, 'sale', 'HP EliteBook 840 G5 (Used)',
   'Intel Core i5, 8GB RAM, 256GB SSD. Great for engineering and commerce students. Comes with charger.',
   650.00, NULL, NULL, 'good',
   'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=600&fit=crop',
   NULL, 4.8, 12, 'active'),

  (14, 1, 2, 'rent', 'University Physics (Young & Freedman)',
   'Prescribed physics textbook available for weekly rental. Perfect for students taking physics for one semester.',
   80.00, 'week', NULL, 'like_new',
   'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=600&fit=crop',
   NULL, 4.8, 4, 'active'),

  (15, 2, 3, 'sale', 'Anti-Theft Laptop Backpack',
   'Fits 15.6" laptops. Hidden zip compartment and USB charging port. Ideal for campus commute.',
   180.00, NULL, NULL, 'fair',
   'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop',
   NULL, 4.8, 8, 'active'),

  (16, 2, 1, 'sale', 'Sony WH-CH510 Wireless Headphones',
   'Bluetooth over-ear headphones with 35-hour battery. Perfect for study sessions in the library.',
   450.00, NULL, NULL, 'like_new',
   'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop',
   NULL, 4.8, 2, 'active'),

  (17, 6, 1, 'sale', 'Casio FX-991ES Plus Calculator',
   'Exam-approved scientific calculator. Required for engineering, science and accounting courses.',
   250.00, NULL, NULL, 'like_new',
   'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600&h=600&fit=crop',
   NULL, 4.9, 15, 'active'),

  (18, 3, 2, 'sale', 'LED Desk Lamp with USB Port',
   'Three brightness settings with built-in USB charging. Perfect for late-night study.',
   120.00, NULL, NULL, 'fair',
   'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&h=600&fit=crop',
   NULL, 4.5, 6, 'active'),

  (19, 1, 3, 'sale', 'Organic Chemistry (Clayden, 2nd Edition)',
   'Prescribed textbook for 2nd and 3rd year chemistry students. Cover shows slight wear.',
   380.00, NULL, NULL, 'good',
   'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=600&h=600&fit=crop',
   NULL, 4.7, 3, 'active'),

  (20, 6, 1, 'sale', 'Mini Bar Fridge (46L)',
   'Compact bar fridge fits perfectly in a res room. Energy-efficient and quiet.',
   680.00, NULL, NULL, 'fair',
   'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&h=600&fit=crop',
   NULL, 4.3, 5, 'active'),

  (23, 1, 1, 'sale', 'Introduction to Computer Science Textbook',
   'Lightly used textbook in good condition.',
   350.00, NULL, NULL, 'good',
   'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=600&fit=crop',
   'UCT Upper Campus', 0.0, 0, 'active'),

  (23, 2, 1, 'sale', 'Wireless Keyboard',
   'Compact wireless keyboard suitable for study spaces.',
   250.00, NULL, NULL, 'like_new',
   'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&h=600&fit=crop',
   'UCT Upper Campus', 0.0, 0, 'active'),

  (23, 3, 2, 'sale', 'Study Desk',
   'Sturdy desk suitable for a student residence.',
   800.00, NULL, NULL, 'good',
   'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&h=600&fit=crop',
   'Wits Braamfontein', 0.0, 0, 'active'),

  -- Swap listings — unique image each
  (13, 1, 1, 'swap', 'Calculus: Early Transcendentals (8th Ed)',
   'Prescribed for MATH100. Would like to swap for a Statistics or Linear Algebra textbook.',
   0.00, NULL, 'Statistics or Linear Algebra textbook', 'good',
   'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&h=600&fit=crop',
   'UCT Upper Campus', 0.0, 0, 'active'),

  (14, 2, 2, 'swap', 'Casio FX-82 Calculator',
   'Extra calculator I no longer need. Looking to swap for a good pair of headphones.',
   0.00, NULL, 'Over-ear headphones', 'like_new',
   'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600&h=600&fit=crop',
   'Wits Braamfontein', 0.0, 0, 'active'),

  (16, 3, 1, 'swap', 'Desk Lamp (Warm Light)',
   'Moving out at end of term. Looking to swap for any dorm storage crates.',
   0.00, NULL, 'Dorm storage crates', 'good',
   'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&h=600&fit=crop',
   'UCT Upper Campus', 0.0, 0, 'active'),

  (17, 1, 1, 'swap', 'Organic Chemistry: Structure and Function',
   'Finished CHEM201 with this. Would swap for an Introduction to Physics textbook.',
   0.00, NULL, 'Introduction to Physics textbook', 'fair',
   'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=600&h=600&fit=crop',
   'UCT Upper Campus', 0.0, 0, 'active'),

  (19, 6, 3, 'swap', 'Study Desk Organiser',
   'Wooden organiser with compartments. Happy to swap for a small bookshelf.',
   0.00, NULL, 'Small bookshelf', 'good',
   'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600&h=600&fit=crop',
   'Stellenbosch Campus', 0.0, 0, 'active');

INSERT INTO service_types (name, description, is_active, accepts_emergency) VALUES
  ('Plumbing',   'Water leaks, taps, pipes, toilets and plumbing repairs.', 1, 1),
  ('Electrical', 'Electrical faults, plugs, lights, breakers and wiring.', 1, 1),
  ('Cleaning',   'Residential and student accommodation cleaning services.', 1, 0),
  ('Gardening',  'Garden maintenance, landscaping and outdoor cleaning.', 1, 0),
  ('Security',   'Locksmith, security and emergency access services.', 1, 1),
  ('Handyman',   'General maintenance, repairs and assembly services.', 1, 0);

INSERT INTO provider_services (provider_id, service_type_id) VALUES
  (8, 1), (8, 6),
  (9, 2),
  (10, 6), (10, 4),
  (11, 6),
  (12, 6);

INSERT INTO service_provider_profiles
  (user_id, business_name, service_type, bio, location, experience_years, service_area, company, hourly_rate, rating, total_reviews, verification_status, accepts_emergency)
VALUES
  (8,  'Cape Town Express Plumbing', 'Plumbing',   '24/7 emergency plumbing for student residences.', 'Cape Town', 8,  'UCT, CPUT, UWC', 'Cape Town Express Plumbing', 350.00, 4.9, 22, 'verified', 1),
  (9,  'Sipho Electrical Solutions', 'Electrical', 'Certified electrician, all residential work.',    'Cape Town', 5,  'UCT, CPUT',      'Sipho Electrical Solutions', 400.00, 4.8, 14, 'verified', 1),
  (10, 'Campus Handy Helpers',       'Handyman',   'General maintenance, repairs and assembly.',       'Cape Town', 3,  'CPUT, UWC',      'Campus Handy Helpers',       250.00, 4.7, 19, 'verified', 0),
  (11, 'QuickFix Appliance Repair',  'Handyman',   'Fast appliance repairs on campus.',                'Cape Town', 6,  'CPUT, UWC',      'QuickFix Appliance Repair',  300.00, 4.6, 11, 'verified', 0),
  (12, 'Dorm Assembly & Carpentry',  'Handyman',   'Flat-pack assembly and custom carpentry.',         'Cape Town', 10, 'UWC, UCT',       'Dorm Assembly & Carpentry',  380.00, 4.9, 30, 'verified', 0);

-- Services across every workflow state so each dashboard has something to show.
INSERT INTO services (student_id, service_provider_id, service_type_id, title, description, residence_name, room_number, status, priority, estimated_cost) VALUES
  (22, NULL, 2, 'Tripped Circuit Breaker',  'Power lost after plugging in kettle.',           'Fuller Hall', '114', 'pending',     'emergency', NULL),
  (13, NULL, 6, 'Broken desk drawer',       'Drawer rail came off, need repair.',             'Smuts Hall',  '204', 'pending',     'normal',    NULL),
  (15, NULL, 3, 'Deep clean room',          'End-of-term deep clean.',                        'Smuts Hall',  '102', 'pending',     'normal',    NULL),
  (14, 8,  1, 'Leaking kitchen tap',        'Hot water tap will not close fully.',            'Smuts Hall',  '302', 'quoted',      'normal',    250.00),
  (16, 9,  2, 'Faulty plug point',          'Wall socket sparks when anything is plugged in.','Fuller Hall', '118', 'quoted',      'emergency', 320.00),
  (17, 10, 6, 'Assemble bookshelf',         'Flat-pack bookshelf needs to be assembled.',     'Fuller Hall', '401', 'approved',    'normal',    220.00),
  (18, 8,  1, 'Blocked shower drain',       'Shower drain is slow.',                          'Smuts Hall',  '210', 'in_progress', 'normal',    180.00),
  (19, 9,  2, 'Bedside lamp not working',   'Lamp stopped turning on after load-shedding.',   'Fuller Hall', '220', 'completed',   'normal',    140.00),
  (20, 12, 6, 'Wardrobe door repair',       'Hinge came loose.',                              'Smuts Hall',  '108', 'paid',        'normal',    200.00),
  (21, 8,  1, 'Leaking Kitchen Tap',        'Hot water tap won''t close fully.',              'Smuts Hall',  '302', 'assigned',    'normal',    250.00);

INSERT INTO residences (manager_id, name, location, rooms_available, monthly_price, description, status) VALUES
  (5,    'Smuts Hall Residence',     'UCT Upper Campus, Cape Town', 12, 4500.00, 'Historic men''s residence on UCT upper campus.',  'active'),
  (5,    'Fuller Hall Residence',    'UCT Upper Campus, Cape Town',  8, 4200.00, 'Mixed residence with dining hall.',               'active'),
  (6,    'CPUT Bellville Residence', 'Bellville Campus, Cape Town', 15, 3800.00, 'Affordable student housing near CPUT Bellville.', 'active'),
  (7,    'UWC Student Village',      'Bellville, Cape Town',        20, 3600.00, 'Modern student village on UWC campus.',           'active'),
  (NULL, 'Claremont House',          'Claremont',                    3, 3900.00, 'Student accommodation',                           'active'),
  (NULL, 'Mowbray Residence',        'Mowbray',                      9, 3600.00, 'Student accommodation',                           'active'),
  (NULL, 'Observatory Lodge',        'Observatory',                  2, 4500.00, 'Student accommodation',                           'active');

INSERT INTO residence_requests (residence_id, student_id, status, notes) VALUES
  (1, 13, 'pending',  'Requesting for Semester 2.'),
  (2, 14, 'approved', 'Approved by manager on 20 Sep.'),
  (3, 15, 'pending',  'Preference: room with a view.'),
  (4, 16, 'declined', 'No rooms available for requested period.'),
  (1, 17, 'approved', 'Approved.');

INSERT INTO residence_payments (residence_id, student_id, amount, period_start, period_end, due_date, paid_at, status) VALUES
  (1, 13, 4200.00, '2026-09-01', '2026-09-30', '2026-09-05', '2026-09-03 10:00:00', 'paid'),
  (1, 14, 4200.00, '2026-09-01', '2026-09-30', '2026-09-05', NULL,                  'late'),
  (2, 15, 4200.00, '2026-09-01', '2026-09-30', '2026-09-05', '2026-09-04 09:12:00', 'paid'),
  (3, 16, 3800.00, '2026-09-01', '2026-09-30', '2026-09-05', NULL,                  'upcoming'),
  (4, 17, 3600.00, '2026-09-01', '2026-09-30', '2026-09-05', '2026-09-05 14:00:00', 'paid');

INSERT INTO orders (order_reference, buyer_id, seller_id, total_amount, status, payment_status) VALUES
  ('ORD-2026-0001', 21, 13, 650.00, 'pending',   'pending'),
  ('ORD-2026-0002', 13, 14,  80.00, 'paid',      'complete'),
  ('ORD-2026-0003', 14, 16, 450.00, 'shipped',   'complete'),
  ('ORD-2026-0004', 15, 17, 250.00, 'completed', 'complete'),
  ('ORD-2026-0005', 16, 18, 120.00, 'pending',   'pending');

INSERT INTO order_items (order_id, product_id, seller_id, quantity, unit_price) VALUES
  (1, 1, 13, 1, 650.00),
  (2, 2, 14, 1,  80.00),
  (3, 4, 16, 1, 450.00),
  (4, 5, 17, 1, 250.00),
  (5, 6, 18, 1, 120.00);

INSERT INTO payments (order_id, amount, status) VALUES
  (1, 650.00, 'pending'),
  (2,  80.00, 'complete'),
  (3, 450.00, 'complete'),
  (4, 250.00, 'released'),
  (5, 120.00, 'pending');

INSERT INTO reviews (product_id, reviewer_id, reviewer_name, product_rating, seller_rating, comment) VALUES
  (1, 21, 'Lerato Student', 5, 5, 'Great laptop, exactly as described! Excellent communication.'),
  (5, 22, 'Zaarah Student', 5, 5, 'Quick pickup at the campus safe zone. Calculator works perfectly.'),
  (2, 13, 'Thabo M.',       4, 5, 'Great condition, quick pickup.'),
  (4, 14, 'Aisha K.',       5, 5, 'Works perfectly, exactly as described.'),
  (6, 16, 'Naledi S.',      4, 4, 'Good value for the price.');

INSERT INTO reports (reporter_id, reported_user_id, product_id, reason, details, status) VALUES
  (21, 14, 2, 'Off-Platform Request', 'Seller asked to handle payment outside CampusSwap.', 'pending'),
  (13, 15, 3, 'Item not as described', 'Backpack had a torn strap not visible in photos.',  'pending'),
  (14, 17, 5, 'Late delivery',         'Item was promised for Monday, arrived Thursday.',   'reviewed'),
  (15, 19, 7, 'Suspected counterfeit', 'Textbook looks like a photocopy.',                  'pending'),
  (16, 20, 8, 'Rude communication',    'Seller was aggressive in chat.',                    'dismissed');

INSERT INTO notifications (user_id, type, title, message, is_read) VALUES
  (13, 'payment',           'Payment received',        'Your payment of R80.00 has been confirmed.',              FALSE),
  (13, 'residence_request', 'Residence request update','Your application for a room is under review.',           TRUE),
  (14, 'move_out',          'Move-out notice',         'Please complete your move-out checklist by 30 Sep.',      FALSE),
  (15, 'swap_request',      'New swap request',        'A student wants to swap for your Calculus textbook.',     FALSE),
  (16, 'safety_report',     'Safety report received',  'Your safety report has been logged and is being reviewed.', TRUE);

INSERT INTO safehome_reports (user_id, incident_type, description, location, status) VALUES
  (13, 'Water leak',   'Pipe leaking into the corridor.',          'Smuts Hall, Floor 2',      'open'),
  (14, 'Broken lock',  'Room door lock jammed.',                   'Fuller Hall, Room 118',    'reviewing'),
  (15, 'No hot water', 'Water heater not working for 3 days.',     'Smuts Hall, Floor 1',      'open'),
  (16, 'Noise',        'Repeated noise after quiet hours.',        'Fuller Hall, Floor 4',     'closed'),
  (17, 'Power trip',   'Breaker trips when kettle is plugged in.', 'Fuller Hall, Room 220',    'reviewing');

INSERT INTO favorites (user_id, product_id) VALUES
  (13, 2), (13, 5),
  (14, 1), (14, 3),
  (15, 4), (15, 6),
  (16, 2), (17, 5);

INSERT INTO swap_requests (product_id, buyer_id, seller_id, swap_for, message, status) VALUES
  (2,  13, 14, 'Casio FX-991ES',    'Would you swap for a calculator?', 'pending'),
  (4,  14, 16, 'LED Desk Lamp',     'I have a spare lamp.',             'accepted'),
  (7,  15, 19, 'Organic Chemistry', 'Looking for Clayden 2nd edition.', 'pending'),
  (10, 16, 20, 'Wireless Keyboard', 'Any keyboard will do.',            'declined'),
  (11, 17, 23, 'Study Desk',        'I have a smaller desk to swap.',   'pending');

INSERT INTO advertisements (created_by, title, description, image_url, status, starts_at, ends_at) VALUES
  (1, 'Campus Bookstore Sale', '20% off all prescribed textbooks.', 'https://placehold.co/600x400?text=Bookstore', 'active',  '2026-09-01 00:00:00', '2026-10-31 23:59:59'),
  (1, 'SafeHome Promo',        'First repair request is free.',     'https://placehold.co/600x400?text=SafeHome',  'active',  '2026-09-15 00:00:00', '2026-10-15 23:59:59'),
  (2, 'Wits Housing Fair',     'Find your 2027 residence early.',   'https://placehold.co/600x400?text=Housing',   'pending', '2026-10-01 00:00:00', '2026-10-31 23:59:59'),
  (1, 'Study Snacks',          'Sponsored by SnackCo.',             'https://placehold.co/600x400?text=Snacks',    'active',  '2026-09-10 00:00:00', '2026-10-10 23:59:59'),
  (3, 'Res Manager Training',  'Free online workshop series.',      'https://placehold.co/600x400?text=Training',  'draft',   '2026-11-01 00:00:00', '2026-11-30 23:59:59');

INSERT INTO subscriptions (user_id, plan, status) VALUES
  (13, 'Student Pro', 'active'),
  (14, 'Basic Pass',  'active'),
  (15, 'Student Pro', 'expired'),
  (21, 'Student Pro', 'active'),
  (22, 'Basic Pass',  'active');

INSERT INTO books (title, author, description, price, size, module, format, cover_url, seller_id) VALUES
  ('Organic Chemistry: Compiled Lecture Notes',
   'Compiled by Aisha K. — 2nd year Chem',
   'A semester''s worth of annotated lecture notes covering reaction mechanisms, with diagrams redrawn for clarity.',
   65.00, '18 MB · PDF', 'CHEM201', 'guide',
   'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=400&h=600&fit=crop',
   14),

  ('Calculus I: Worked Practice Problems',
   'Compiled by Sipho D.',
   'Over 120 worked problems with full step-by-step solutions, grouped by topic for exam prep.',
   45.00, '9 MB · PDF', 'MATH110', 'guide',
   'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&h=600&fit=crop',
   17),

  ('Intro to Python: A Beginner''s Companion',
   'Karabo N.',
   'Self-published eBook walking new CS students through Python fundamentals with campus-relevant examples.',
   90.00, '4 MB · EPUB', 'CSC102', 'ebook',
   'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&h=600&fit=crop',
   18),

  ('Macroeconomics: The Audio Primer',
   'Narrated by Liam P.',
   'A 3-hour audio walkthrough of core macro concepts, recorded for revision on the go between lectures.',
   55.00, '3h 04m · MP3', 'ECON201', 'audiobook',
   'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=600&fit=crop',
   15),

  ('Cell Biology: Illustrated Summary',
   'Naledi S.',
   'Original hand-drawn diagrams and concise summaries covering the full first-year cell biology syllabus.',
   70.00, '22 MB · PDF', 'BIOL110', 'ebook',
   'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=400&h=600&fit=crop',
   16),

  ('Statistics Basics: Narrated Revision',
   'Narrated by Thabo M.',
   'A relaxed, narrated run-through of descriptive and inferential statistics ahead of the mid-year test.',
   40.00, '1h 48m · MP3', 'STAT120', 'audiobook',
   'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=400&h=600&fit=crop',
   13),

  ('Academic Writing Toolkit',
   'Compiled by Zanele P.',
   'A practical guide to research, referencing, editing, and structuring assignments for first-year students.',
   50.00, '12 MB · PDF', 'GEN101', 'guide',
   'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&h=600&fit=crop',
   20),

  ('Introduction to Psychology',
   'Compiled by Mia D.',
   'A concise eBook that pairs key psychology theories with clear case studies and self-test questions.',
   75.00, '15 MB · EPUB', 'PSY101', 'ebook',
   'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=600&fit=crop',
   13);
   

