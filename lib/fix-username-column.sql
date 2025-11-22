-- Script SQL để sửa các vấn đề với cột username
-- Chạy script này trong Neon SQL Editor

-- ============================================
-- 1. KIỂM TRA CẤU TRÚC HIỆN TẠI
-- ============================================
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'username';

-- ============================================
-- 2. XÓA CONSTRAINT UNIQUE CŨ (nếu có vấn đề)
-- ============================================
-- Tìm tên constraint unique trên username
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint con
    INNER JOIN pg_class rel ON rel.oid = con.conrelid
    INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    INNER JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
    WHERE rel.relname = 'users' 
      AND a.attname = 'username'
      AND con.contype = 'u';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE users DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Đã xóa constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'Không tìm thấy constraint unique trên username';
    END IF;
END $$;

-- ============================================
-- 3. XÓA INDEX CŨ (nếu cần)
-- ============================================
DROP INDEX IF EXISTS idx_users_username;

-- ============================================
-- 4. XÓA CỘT USERNAME CŨ (nếu cần sửa lại)
-- ============================================
-- CHỈ CHẠY NẾU BẠN CHẮC CHẮN MUỐN XÓA VÀ TẠO LẠI
-- ALTER TABLE users DROP COLUMN IF EXISTS username;

-- ============================================
-- 5. TẠO LẠI CỘT USERNAME VỚI CẤU TRÚC ĐÚNG
-- ============================================
-- Nếu cột chưa tồn tại, tạo mới
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'username'
    ) THEN
        ALTER TABLE users ADD COLUMN username VARCHAR(50);
        RAISE NOTICE 'Đã tạo cột username';
    ELSE
        RAISE NOTICE 'Cột username đã tồn tại';
    END IF;
END $$;

-- ============================================
-- 6. TẠO UNIQUE CONSTRAINT (cho phép NULL)
-- ============================================
-- Tạo unique constraint chỉ áp dụng cho giá trị không NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique 
ON users(username) 
WHERE username IS NOT NULL;

-- ============================================
-- 7. TẠO INDEX ĐỂ TĂNG TỐC ĐỘ TÌM KIẾM
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_username 
ON users(username);

-- ============================================
-- 8. KIỂM TRA KẾT QUẢ
-- ============================================
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'username';

SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users' AND indexname LIKE '%username%';

