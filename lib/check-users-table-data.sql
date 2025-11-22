-- Script SQL để kiểm tra dữ liệu và cấu trúc bảng users
-- Chạy script này trong Neon SQL Editor để xem chi tiết

-- ============================================
-- 1. KIỂM TRA TẤT CẢ CÁC CỘT TRONG BẢNG USERS
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

-- ============================================
-- 2. KIỂM TRA DỮ LIỆU HIỆN CÓ
-- ============================================
SELECT 
    id,
    username,
    email,
    name,
    phone,
    agent_code,
    role,
    wallet_balance,
    commission,
    is_frozen,
    created_at
FROM users
ORDER BY id;

-- ============================================
-- 3. KIỂM TRA CÁC USER KHÔNG CÓ USERNAME
-- ============================================
SELECT 
    id,
    email,
    name,
    phone,
    username
FROM users
WHERE username IS NULL OR username = '';

-- ============================================
-- 4. KIỂM TRA USERNAME TRÙNG LẶP (nếu có)
-- ============================================
SELECT 
    username,
    COUNT(*) as count
FROM users
WHERE username IS NOT NULL
GROUP BY username
HAVING COUNT(*) > 1;

-- ============================================
-- 5. KIỂM TRA CONSTRAINT VÀ INDEX
-- ============================================
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    a.attname as column_name
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
LEFT JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
WHERE rel.relname = 'users'
ORDER BY conname;

-- ============================================
-- 6. KIỂM TRA INDEX
-- ============================================
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users';

