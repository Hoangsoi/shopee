-- Script SQL để sửa constraint và đảm bảo username hoạt động đúng
-- Chạy script này trong Neon SQL Editor

-- ============================================
-- 1. KIỂM TRA CONSTRAINT HIỆN TẠI
-- ============================================
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    a.attname as column_name
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
LEFT JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
WHERE rel.relname = 'users' AND a.attname = 'username'
ORDER BY conname;

-- ============================================
-- 2. XÓA CÁC CONSTRAINT VÀ INDEX CŨ (nếu có)
-- ============================================
-- Xóa unique constraint cũ (nếu có)
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
    END IF;
END $$;

-- Xóa index cũ
DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_users_username_unique;

-- ============================================
-- 3. TẠO LẠI UNIQUE CONSTRAINT ĐÚNG CÁCH
-- ============================================
-- Tạo unique index chỉ áp dụng cho giá trị không NULL
-- Điều này cho phép nhiều NULL nhưng không cho phép trùng giá trị
CREATE UNIQUE INDEX idx_users_username_unique 
ON users(username) 
WHERE username IS NOT NULL;

-- Tạo index thường để tăng tốc độ tìm kiếm
CREATE INDEX idx_users_username 
ON users(username);

-- ============================================
-- 4. KIỂM TRA KẾT QUẢ
-- ============================================
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users' AND indexname LIKE '%username%';

-- Kiểm tra constraint
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    a.attname as column_name
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
LEFT JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
WHERE rel.relname = 'users' AND a.attname = 'username'
ORDER BY conname;

