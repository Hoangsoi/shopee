-- Script SQL để tạo bảng notifications và banners
-- Chạy script này trong Neon SQL Editor

-- 1. Tạo bảng notifications (thông báo chữ chạy)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo index cho notifications
CREATE INDEX IF NOT EXISTS idx_notifications_active ON notifications(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_sort ON notifications(sort_order);

-- Thêm dữ liệu mẫu
INSERT INTO notifications (content, is_active, sort_order) VALUES
('🎉 Khuyến mãi đặc biệt - Giảm giá lên đến 50%', true, 1),
('🚚 Miễn phí vận chuyển cho đơn hàng trên 500.000đ', true, 2),
('⭐ Sản phẩm mới cập nhật hàng ngày', true, 3),
('💎 Chương trình VIP với nhiều ưu đãi độc quyền', true, 4)
ON CONFLICT DO NOTHING;

-- 2. Tạo bảng banners (ảnh banner chạy)
CREATE TABLE IF NOT EXISTS banners (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  title VARCHAR(255),
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo index cho banners
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banners_sort ON banners(sort_order);

-- Thêm dữ liệu mẫu
INSERT INTO banners (image_url, title, is_active, sort_order) VALUES
('https://images.unsplash.com/photo-1607082349566-187342175e2f', 'Banner 1', true, 1),
('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da', 'Banner 2', true, 2),
('https://images.unsplash.com/photo-1607082349566-187342175e2f', 'Banner 3', true, 3),
('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da', 'Banner 4', true, 4),
('https://images.unsplash.com/photo-1607082349566-187342175e2f', 'Banner 5', true, 5)
ON CONFLICT DO NOTHING;

