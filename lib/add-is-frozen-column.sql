-- Script SQL để thêm cột is_frozen vào bảng users
-- Chạy script này trong Neon SQL Editor hoặc thông qua API migration

-- Thêm cột is_frozen (mặc định false - không đóng băng)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT false;

-- Tạo index cho is_frozen để tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_users_is_frozen ON users(is_frozen);

-- Kiểm tra kết quả
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'is_frozen';

