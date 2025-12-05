-- ============================================
-- FIX ADMIN ROLE - Đảm bảo role chính xác
-- ============================================

-- BƯỚC 1: Kiểm tra role hiện tại (xem có vấn đề gì)
SELECT 
    id,
    email,
    name,
    role,
    LENGTH(role) as role_length,
    role = 'admin' as is_exact_admin,
    LOWER(TRIM(role)) = 'admin' as is_lowercase_admin,
    role IS NULL as is_null,
    created_at
FROM users 
WHERE email = 'admin@gmail.com';  -- ⬅️ THAY EMAIL Ở ĐÂY

-- BƯỚC 2: Xem tất cả các giá trị role khác nhau trong database
SELECT DISTINCT role, COUNT(*) as count
FROM users
GROUP BY role
ORDER BY role;

-- BƯỚC 3: Fix role - Đảm bảo role = 'admin' chính xác
-- (Loại bỏ khoảng trắng, chuyển về lowercase)
UPDATE users 
SET 
    role = 'admin',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@gmail.com';  -- ⬅️ THAY EMAIL Ở ĐÂY

-- BƯỚC 4: Kiểm tra lại sau khi fix
SELECT 
    id,
    email,
    name,
    role,
    LENGTH(role) as role_length,
    role = 'admin' as is_exact_admin,
    updated_at
FROM users 
WHERE email = 'admin@gmail.com';  -- ⬅️ THAY EMAIL Ở ĐÂY

-- ============================================
-- FIX CHO TẤT CẢ USER CÓ ROLE KHÔNG CHÍNH XÁC
-- ============================================

-- Fix tất cả role có khoảng trắng hoặc case không đúng
UPDATE users
SET 
    role = CASE 
        WHEN LOWER(TRIM(role)) = 'admin' THEN 'admin'
        WHEN LOWER(TRIM(role)) = 'user' THEN 'user'
        ELSE role
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE role IS NOT NULL 
  AND (TRIM(role) != role OR LOWER(role) != role);

-- ============================================
-- TÌM USER CÓ ROLE BẤT THƯỜNG
-- ============================================

-- Tìm user có role không phải 'user' hoặc 'admin'
SELECT 
    id,
    email,
    name,
    role,
    LENGTH(role) as role_length
FROM users
WHERE role IS NULL 
   OR role = ''
   OR LOWER(TRIM(role)) NOT IN ('user', 'admin')
   OR TRIM(role) != role;

