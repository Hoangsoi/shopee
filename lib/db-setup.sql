-- Tạo bảng users cho đăng ký/đăng nhập
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo index cho email để tìm kiếm nhanh hơn
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

