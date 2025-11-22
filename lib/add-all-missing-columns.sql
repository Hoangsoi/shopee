-- Script SQL để thêm TẤT CẢ các cột còn thiếu vào bảng users
-- Chạy script này trong Neon SQL Editor

-- ============================================
-- 1. THÊM CỘT USERNAME
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'username'
    ) THEN
        ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        RAISE NOTICE '✓ Đã thêm cột username';
    ELSE
        RAISE NOTICE '✗ Cột username đã tồn tại';
    END IF;
END $$;

-- ============================================
-- 2. THÊM CỘT WALLET_BALANCE
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'wallet_balance'
    ) THEN
        ALTER TABLE users ADD COLUMN wallet_balance DECIMAL(15, 2) DEFAULT 0;
        RAISE NOTICE '✓ Đã thêm cột wallet_balance';
    ELSE
        RAISE NOTICE '✗ Cột wallet_balance đã tồn tại';
    END IF;
END $$;

-- ============================================
-- 3. THÊM CỘT COMMISSION
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'commission'
    ) THEN
        ALTER TABLE users ADD COLUMN commission DECIMAL(15, 2) DEFAULT 0;
        RAISE NOTICE '✓ Đã thêm cột commission';
    ELSE
        RAISE NOTICE '✗ Cột commission đã tồn tại';
    END IF;
END $$;

-- ============================================
-- 4. THÊM CỘT ROLE
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
        RAISE NOTICE '✓ Đã thêm cột role';
    ELSE
        RAISE NOTICE '✗ Cột role đã tồn tại';
    END IF;
END $$;

-- ============================================
-- 5. THÊM CỘT IS_FROZEN
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_frozen'
    ) THEN
        ALTER TABLE users ADD COLUMN is_frozen BOOLEAN DEFAULT false;
        RAISE NOTICE '✓ Đã thêm cột is_frozen';
    ELSE
        RAISE NOTICE '✗ Cột is_frozen đã tồn tại';
    END IF;
END $$;

-- ============================================
-- 6. THÊM CỘT PHONE (nếu chưa có)
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
        CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
        RAISE NOTICE '✓ Đã thêm cột phone';
    ELSE
        RAISE NOTICE '✗ Cột phone đã tồn tại';
    END IF;
END $$;

-- ============================================
-- 7. THÊM CỘT AGENT_CODE (nếu chưa có)
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'agent_code'
    ) THEN
        ALTER TABLE users ADD COLUMN agent_code VARCHAR(50);
        RAISE NOTICE '✓ Đã thêm cột agent_code';
    ELSE
        RAISE NOTICE '✗ Cột agent_code đã tồn tại';
    END IF;
END $$;

-- ============================================
-- 8. CẬP NHẬT GIÁ TRỊ MẶC ĐỊNH CHO CÁC USER HIỆN CÓ
-- ============================================
UPDATE users 
SET wallet_balance = 0
WHERE wallet_balance IS NULL;

UPDATE users 
SET commission = 0
WHERE commission IS NULL;

UPDATE users 
SET role = 'user'
WHERE role IS NULL;

UPDATE users 
SET is_frozen = false
WHERE is_frozen IS NULL;

-- ============================================
-- 9. KIỂM TRA KẾT QUẢ - XEM TẤT CẢ CÁC CỘT
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

