-- ============================================
-- QUICK SET ADMIN - Copy và chạy trong Neon SQL Editor
-- ============================================

-- BƯỚC 1: Xem tất cả users để tìm email của bạn
SELECT 
    id, 
    email, 
    name, 
    role,
    wallet_balance,
    created_at
FROM users 
ORDER BY created_at DESC;

-- BƯỚC 2: Set role admin cho email của bạn
-- ⚠️ THAY 'admin@gmail.com' BẰNG EMAIL THẬT CỦA BẠN
UPDATE users 
SET 
    role = 'admin', 
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@gmail.com';  -- ⬅️ THAY EMAIL Ở ĐÂY

-- BƯỚC 3: Kiểm tra lại xem đã set thành công chưa
SELECT 
    id, 
    email, 
    name, 
    role,
    updated_at
FROM users 
WHERE email = 'admin@gmail.com';  -- ⬅️ THAY EMAIL Ở ĐÂY

-- ============================================
-- NẾU KHÔNG BIẾT EMAIL, TÌM USER MỚI NHẤT
-- ============================================

-- Tìm user mới nhất (có thể là bạn)
SELECT 
    id, 
    email, 
    name, 
    role,
    created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- Set admin cho user có ID cụ thể (ví dụ ID = 5)
-- UPDATE users 
-- SET role = 'admin', updated_at = CURRENT_TIMESTAMP
-- WHERE id = 5;  -- ⬅️ THAY ID Ở ĐÂY

-- ============================================
-- XEM TẤT CẢ ADMINS HIỆN TẠI
-- ============================================

SELECT 
    id, 
    email, 
    name, 
    role,
    created_at
FROM users 
WHERE role = 'admin';

