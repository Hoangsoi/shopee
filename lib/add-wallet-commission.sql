-- Script SQL để thêm cột wallet_balance và commission vào bảng users
-- Chạy script này trong Neon SQL Editor

-- Thêm cột wallet_balance (số dư ví)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'wallet_balance'
    ) THEN
        ALTER TABLE users ADD COLUMN wallet_balance DECIMAL(15, 2) DEFAULT 0;
        RAISE NOTICE 'Đã thêm cột wallet_balance';
    ELSE
        RAISE NOTICE 'Cột wallet_balance đã tồn tại';
    END IF;
END $$;

-- Thêm cột commission (hoa hồng)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'commission'
    ) THEN
        ALTER TABLE users ADD COLUMN commission DECIMAL(15, 2) DEFAULT 0;
        RAISE NOTICE 'Đã thêm cột commission';
    ELSE
        RAISE NOTICE 'Cột commission đã tồn tại';
    END IF;
END $$;

-- Cập nhật giá trị mặc định cho các user hiện có (nếu NULL)
UPDATE users
SET wallet_balance = 0
WHERE wallet_balance IS NULL;

UPDATE users
SET commission = 0
WHERE commission IS NULL;

-- Kiểm tra kết quả
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
    AND column_name IN ('wallet_balance', 'commission')
ORDER BY column_name;

