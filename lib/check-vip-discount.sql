-- Script để kiểm tra và cập nhật discount_percent cho VIP category
-- Chạy script này trong Neon SQL Editor

-- 1. Kiểm tra giá trị hiện tại của VIP category
SELECT 
    id,
    name,
    slug,
    discount_percent,
    is_active,
    updated_at
FROM categories
WHERE name = 'VIP';

-- 2. Cập nhật discount_percent cho VIP category thành 70
UPDATE categories
SET discount_percent = 70,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'VIP';

-- 3. Kiểm tra lại giá trị sau khi cập nhật
SELECT 
    id,
    name,
    slug,
    discount_percent,
    is_active,
    updated_at
FROM categories
WHERE name = 'VIP';

