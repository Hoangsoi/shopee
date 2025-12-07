-- Migration: Thêm indexes để tối ưu performance
-- Chạy script này trong Neon SQL Editor để cải thiện tốc độ query

-- ============================================
-- 1. INDEXES CHO BẢNG INVESTMENTS
-- ============================================

-- Composite index cho query expired investments (status + maturity_date)
CREATE INDEX IF NOT EXISTS idx_investments_status_maturity 
ON investments(status, maturity_date) 
WHERE status = 'active' AND maturity_date IS NOT NULL;

-- Index cho user_id (đã có thể có, nhưng đảm bảo)
CREATE INDEX IF NOT EXISTS idx_investments_user_id 
ON investments(user_id);

-- Index cho maturity_date riêng (cho các query filter theo date)
CREATE INDEX IF NOT EXISTS idx_investments_maturity_date 
ON investments(maturity_date) 
WHERE maturity_date IS NOT NULL;

-- ============================================
-- 2. INDEXES CHO BẢNG TRANSACTIONS
-- ============================================

-- Index cho user_id
CREATE INDEX IF NOT EXISTS idx_transactions_user_id 
ON transactions(user_id);

-- Index cho description với pattern matching (LIKE queries)
-- Note: PostgreSQL không hỗ trợ index trực tiếp cho LIKE, nhưng có thể dùng GIN index cho full-text search
-- Hoặc dùng index cho prefix matching
CREATE INDEX IF NOT EXISTS idx_transactions_description_prefix 
ON transactions(description text_pattern_ops) 
WHERE description LIKE 'Hoàn gốc đầu tư:%' OR description LIKE 'Hoàn hoa hồng đầu tư:%';

-- Index cho created_at (cho sorting)
CREATE INDEX IF NOT EXISTS idx_transactions_created_at 
ON transactions(created_at DESC);

-- ============================================
-- 3. INDEXES CHO BẢNG TICKETS
-- ============================================

-- Composite index cho user_id và draw_date (đã có thể có, nhưng đảm bảo)
CREATE INDEX IF NOT EXISTS idx_tickets_user_draw_date 
ON tickets(user_id, draw_date);

-- Index cho status
CREATE INDEX IF NOT EXISTS idx_tickets_status 
ON tickets(status);

-- ============================================
-- 4. INDEXES CHO BẢNG USERS (nếu chưa có)
-- ============================================

-- Index cho email (thường đã có UNIQUE constraint, nhưng đảm bảo)
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Index cho role (cho admin queries)
CREATE INDEX IF NOT EXISTS idx_users_role 
ON users(role) 
WHERE role = 'admin';

-- Index cho is_frozen (cho filter frozen accounts)
CREATE INDEX IF NOT EXISTS idx_users_is_frozen 
ON users(is_frozen) 
WHERE is_frozen = true;

-- ============================================
-- 5. INDEXES CHO BẢNG SETTINGS
-- ============================================

-- Index cho key (thường đã có UNIQUE constraint)
CREATE INDEX IF NOT EXISTS idx_settings_key 
ON settings(key);

-- Index cho updated_at (cho query latest value)
CREATE INDEX IF NOT EXISTS idx_settings_updated_at 
ON settings(updated_at DESC);

-- ============================================
-- 6. INDEXES CHO BẢNG ORDERS (nếu có)
-- ============================================

-- Index cho user_id
CREATE INDEX IF NOT EXISTS idx_orders_user_id 
ON orders(user_id);

-- Index cho status
CREATE INDEX IF NOT EXISTS idx_orders_status 
ON orders(status);

-- Composite index cho user_id và status
CREATE INDEX IF NOT EXISTS idx_orders_user_status 
ON orders(user_id, status);

-- ============================================
-- VERIFY INDEXES
-- ============================================

-- Kiểm tra các indexes đã được tạo
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('investments', 'transactions', 'tickets', 'users', 'settings', 'orders')
ORDER BY tablename, indexname;

