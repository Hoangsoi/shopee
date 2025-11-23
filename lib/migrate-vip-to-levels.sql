-- Script để migrate từ is_vip (boolean) sang vip_level (integer 0-10)
-- Chạy script này trong Neon SQL Editor

-- 1. Thêm cột vip_level nếu chưa có
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'vip_level'
    ) THEN
        ALTER TABLE users ADD COLUMN vip_level INTEGER DEFAULT 0;
        RAISE NOTICE 'Đã thêm cột vip_level vào bảng users';
    ELSE
        RAISE NOTICE 'Cột vip_level đã tồn tại';
    END IF;
END $$;

-- 2. Migrate dữ liệu từ is_vip sang vip_level (nếu có)
-- Nếu is_vip = true, set vip_level = 1, nếu false thì = 0
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_vip'
    ) THEN
        UPDATE users 
        SET vip_level = CASE WHEN is_vip = true THEN 1 ELSE 0 END
        WHERE vip_level IS NULL OR vip_level = 0;
        RAISE NOTICE 'Đã migrate dữ liệu từ is_vip sang vip_level';
    END IF;
END $$;

-- 3. Kiểm tra kết quả
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('is_vip', 'vip_level');

