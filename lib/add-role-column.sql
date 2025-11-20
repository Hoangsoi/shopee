-- Script SQL để thêm cột role vào bảng users
-- Chạy script này trong Neon SQL Editor

-- Kiểm tra và thêm cột role nếu chưa có
DO $$ 
BEGIN
    -- Kiểm tra xem cột role đã tồn tại chưa
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        -- Thêm cột role với giá trị mặc định là 'user'
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
        RAISE NOTICE 'Đã thêm cột role vào bảng users';
    ELSE
        RAISE NOTICE 'Cột role đã tồn tại';
    END IF;
END $$;

-- Kiểm tra kết quả
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND column_name = 'role';

-- Cập nhật các user hiện có (nếu cần) - set role = 'user' cho các user chưa có role
UPDATE users 
SET role = 'user' 
WHERE role IS NULL;

-- Xem danh sách tất cả các cột trong bảng users
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

