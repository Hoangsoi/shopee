-- Migration: Thêm cột phone và agent_code vào bảng users
-- Chạy script này nếu bảng users đã tồn tại và cần thêm các trường mới

-- Thêm cột phone nếu chưa tồn tại
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
        RAISE NOTICE 'Đã thêm cột phone';
    ELSE
        RAISE NOTICE 'Cột phone đã tồn tại';
    END IF;
END $$;

-- Thêm cột agent_code nếu chưa tồn tại
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'agent_code'
    ) THEN
        ALTER TABLE users ADD COLUMN agent_code VARCHAR(50);
        RAISE NOTICE 'Đã thêm cột agent_code';
    ELSE
        RAISE NOTICE 'Cột agent_code đã tồn tại';
    END IF;
END $$;

-- Tạo index cho phone nếu chưa tồn tại
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Xác nhận migration
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND column_name IN ('phone', 'agent_code')
ORDER BY column_name;

