-- Script SQL hoàn chỉnh để đảm bảo bảng users có đầy đủ các cột
-- Chạy script này trong Neon SQL Editor để kiểm tra và thêm các cột còn thiếu

-- ============================================
-- 1. KIỂM TRA VÀ THÊM CỘT USERNAME
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'username'
    ) THEN
        ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        RAISE NOTICE 'Đã thêm cột username';
    ELSE
        RAISE NOTICE 'Cột username đã tồn tại';
    END IF;
END $$;

-- ============================================
-- 2. KIỂM TRA VÀ THÊM CỘT WALLET_BALANCE
-- ============================================
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

-- ============================================
-- 3. KIỂM TRA VÀ THÊM CỘT COMMISSION
-- ============================================
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

-- ============================================
-- 4. KIỂM TRA VÀ THÊM CỘT ROLE
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
        RAISE NOTICE 'Đã thêm cột role';
    ELSE
        RAISE NOTICE 'Cột role đã tồn tại';
    END IF;
END $$;

-- ============================================
-- 5. KIỂM TRA VÀ THÊM CỘT IS_FROZEN
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_frozen'
    ) THEN
        ALTER TABLE users ADD COLUMN is_frozen BOOLEAN DEFAULT false;
        RAISE NOTICE 'Đã thêm cột is_frozen';
    ELSE
        RAISE NOTICE 'Cột is_frozen đã tồn tại';
    END IF;
END $$;

-- ============================================
-- 6. CẬP NHẬT GIÁ TRỊ MẶC ĐỊNH CHO CÁC USER HIỆN CÓ
-- ============================================
UPDATE users 
SET wallet_balance = COALESCE(wallet_balance, 0)
WHERE wallet_balance IS NULL;

UPDATE users 
SET commission = COALESCE(commission, 0)
WHERE commission IS NULL;

UPDATE users 
SET role = COALESCE(role, 'user')
WHERE role IS NULL;

UPDATE users 
SET is_frozen = COALESCE(is_frozen, false)
WHERE is_frozen IS NULL;

-- ============================================
-- 7. XEM KẾT QUẢ - DANH SÁCH TẤT CẢ CÁC CỘT
-- ============================================
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

