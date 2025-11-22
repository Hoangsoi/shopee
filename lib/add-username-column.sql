-- Script SQL để thêm cột username vào bảng users
-- Chạy script này trong Neon SQL Editor

-- Kiểm tra và thêm cột username nếu chưa có
DO $$ 
BEGIN
    -- Kiểm tra xem cột username đã tồn tại chưa
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'username'
    ) THEN
        -- Thêm cột username với UNIQUE constraint
        ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        RAISE NOTICE 'Đã thêm cột username vào bảng users';
    ELSE
        RAISE NOTICE 'Cột username đã tồn tại';
    END IF;
END $$;

-- Kiểm tra kết quả
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND column_name = 'username';

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

