-- Script để thêm cột vip_level vào bảng users và migrate từ is_vip
-- Chạy script này trong Neon SQL Editor

-- Thêm cột vip_level nếu chưa có
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

-- Migrate dữ liệu từ is_vip sang vip_level (nếu có cột is_vip)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_vip'
    ) THEN
        UPDATE users 
        SET vip_level = CASE WHEN is_vip = true THEN 1 ELSE 0 END
        WHERE vip_level = 0 AND is_vip IS NOT NULL;
        RAISE NOTICE 'Đã migrate dữ liệu từ is_vip sang vip_level';
    END IF;
END $$;

-- Kiểm tra kết quả
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('vip_level', 'is_vip')
ORDER BY column_name;

