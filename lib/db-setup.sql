-- Tạo bảng users cho đăng ký/đăng nhập
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  agent_code VARCHAR(50),
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo index cho email và phone để tìm kiếm nhanh hơn
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Tạo bảng settings để lưu mã đại lý hợp lệ
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thêm mã đại lý mặc định
INSERT INTO settings (key, value, description) 
VALUES ('valid_agent_code', 'SH6688', 'Mã đại lý hợp lệ để đăng ký')
ON CONFLICT (key) DO NOTHING;
