-- ============================================
-- SCRIPT HOÀN CHỈNH ĐỂ TẠO TẤT CẢ CÁC BẢNG
-- Chạy script này trong Neon SQL Editor
-- ============================================

-- 1. Tạo bảng users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  agent_code VARCHAR(50),
  role VARCHAR(20) DEFAULT 'user',
  wallet_balance DECIMAL(15, 2) DEFAULT 0,
  commission DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo index cho users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- 2. Tạo bảng settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thêm mã đại lý mặc định
INSERT INTO settings (key, value, description) 
VALUES ('valid_agent_code', 'SH6688', 'Mã đại lý hợp lệ để đăng ký')
ON CONFLICT (key) DO NOTHING;

-- 3. Tạo bảng categories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  discount_percent INTEGER DEFAULT 0,
  icon VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo index cho categories
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Thêm dữ liệu mẫu cho categories
INSERT INTO categories (name, slug, discount_percent, sort_order) VALUES
('Mỹ phẩm', 'my-pham', 10, 1),
('Điện tử', 'dien-tu', 20, 2),
('Điện lạnh', 'dien-lanh', 30, 3),
('Cao cấp', 'cao-cap', 50, 4),
('VIP', 'vip', 0, 5)
ON CONFLICT (slug) DO NOTHING;

-- 4. Tạo bảng products
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  image_url TEXT,
  category_id INTEGER REFERENCES categories(id),
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo index cho products
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);

-- ============================================
-- KIỂM TRA KẾT QUẢ
-- ============================================

-- Xem danh sách tất cả các bảng
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Xem chi tiết các cột trong bảng users
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Xem chi tiết các cột trong bảng categories
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

-- Xem chi tiết các cột trong bảng products
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- Xem dữ liệu categories
SELECT * FROM categories ORDER BY sort_order;

-- Xem dữ liệu settings
SELECT * FROM settings;

