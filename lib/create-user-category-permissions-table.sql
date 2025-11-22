-- Script SQL để tạo bảng phân quyền khu vực mua hàng
-- Chạy script này trong Neon SQL Editor

-- ============================================
-- 1. TẠO BẢNG USER_CATEGORY_PERMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS user_category_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER REFERENCES users(id),
  UNIQUE(user_id, category_id)
);

-- Tạo index để tăng tốc độ truy vấn
CREATE INDEX IF NOT EXISTS idx_user_category_permissions_user_id ON user_category_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_category_permissions_category_id ON user_category_permissions(category_id);

-- ============================================
-- 2. CẤP QUYỀN MẶC ĐỊNH CHO TẤT CẢ USER HIỆN CÓ
-- (Chỉ cấp quyền cho category "Mỹ phẩm" - slug: 'my-pham')
-- ============================================
INSERT INTO user_category_permissions (user_id, category_id)
SELECT u.id, c.id
FROM users u
CROSS JOIN categories c
WHERE c.slug = 'my-pham'
  AND NOT EXISTS (
    SELECT 1 FROM user_category_permissions ucp
    WHERE ucp.user_id = u.id AND ucp.category_id = c.id
  )
ON CONFLICT (user_id, category_id) DO NOTHING;

-- ============================================
-- 3. KIỂM TRA KẾT QUẢ
-- ============================================
SELECT 
  u.email,
  u.name,
  c.name as category_name,
  c.slug,
  ucp.granted_at
FROM user_category_permissions ucp
JOIN users u ON ucp.user_id = u.id
JOIN categories c ON ucp.category_id = c.id
ORDER BY u.id, c.id;

