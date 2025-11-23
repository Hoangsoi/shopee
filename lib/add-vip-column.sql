-- Script để thêm cột is_vip vào bảng users
-- Chạy script này trong Neon SQL Editor

-- Thêm cột is_vip nếu chưa có
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_vip'
    ) THEN
        ALTER TABLE users ADD COLUMN is_vip BOOLEAN DEFAULT false;
        RAISE NOTICE 'Đã thêm cột is_vip vào bảng users';
    ELSE
        RAISE NOTICE 'Cột is_vip đã tồn tại';
    END IF;
END $$;

-- Kiểm tra kết quả
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'is_vip';

