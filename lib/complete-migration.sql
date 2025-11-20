-- Script SQL hoàn chỉnh để migration database
-- Chạy script này trong Neon SQL Editor để cập nhật toàn bộ database

-- ============================================
-- 1. TẠO BẢNG USERS (nếu chưa có)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  agent_code VARCHAR(50),
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. THÊM CÁC CỘT MỚI (nếu bảng đã tồn tại)
-- ============================================

-- Thêm cột phone
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
        RAISE NOTICE 'Đã thêm cột phone';
    END IF;
END $$;

-- Thêm cột agent_code
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'agent_code'
    ) THEN
        ALTER TABLE users ADD COLUMN agent_code VARCHAR(50);
        RAISE NOTICE 'Đã thêm cột agent_code';
    END IF;
END $$;

-- Thêm cột role
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
        RAISE NOTICE 'Đã thêm cột role';
    END IF;
END $$;

-- Cập nhật role cho các user hiện có (nếu NULL)
UPDATE users 
SET role = 'user' 
WHERE role IS NULL;

-- ============================================
-- 3. TẠO INDEX
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- ============================================
-- 4. TẠO BẢNG SETTINGS
-- ============================================
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

-- ============================================
-- 5. KIỂM TRA KẾT QUẢ
-- ============================================

-- Xem tất cả các cột trong bảng users
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Xem tất cả các cột trong bảng settings
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'settings'
ORDER BY ordinal_position;

-- Xem mã đại lý hiện tại
SELECT key, value, description, updated_at 
FROM settings 
WHERE key = 'valid_agent_code';

-- Đếm số user
SELECT COUNT(*) as total_users FROM users;

