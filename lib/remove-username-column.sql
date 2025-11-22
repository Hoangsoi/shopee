-- Script SQL để xóa cột username và tất cả constraint/index liên quan
-- Chạy script này trong Neon SQL Editor

-- ============================================
-- 1. XÓA TẤT CẢ INDEX LIÊN QUAN ĐẾN USERNAME
-- ============================================
DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_users_username_unique;

-- ============================================
-- 2. XÓA TẤT CẢ CONSTRAINT LIÊN QUAN ĐẾN USERNAME
-- ============================================
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Tìm và xóa tất cả constraint trên cột username
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint con
        INNER JOIN pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        INNER JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
        WHERE rel.relname = 'users' 
          AND a.attname = 'username'
    LOOP
        EXECUTE 'ALTER TABLE users DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Đã xóa constraint: %', constraint_name;
    END LOOP;
END $$;

-- ============================================
-- 3. XÓA CỘT USERNAME
-- ============================================
ALTER TABLE users DROP COLUMN IF EXISTS username;

-- ============================================
-- 4. KIỂM TRA KẾT QUẢ
-- ============================================
-- Kiểm tra xem cột username đã bị xóa chưa
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'username';

-- Xem tất cả các cột còn lại
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Kiểm tra index còn lại
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users';

