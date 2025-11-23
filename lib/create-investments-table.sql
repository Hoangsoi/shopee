-- Tạo bảng investments để lưu thông tin đầu tư
CREATE TABLE IF NOT EXISTS investments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  daily_profit_rate DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
  investment_days INTEGER NOT NULL DEFAULT 1,
  total_profit DECIMAL(15, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  maturity_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_profit_calculated_at TIMESTAMP
);

-- Tạo index cho user_id và status
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);
CREATE INDEX IF NOT EXISTS idx_investments_last_profit_calculated_at ON investments(last_profit_calculated_at);

-- Thêm cài đặt tỷ lệ lợi nhuận mặc định vào bảng settings
INSERT INTO settings (key, value, description) 
VALUES ('investment_daily_profit_rate', '1.00', 'Tỷ lệ lợi nhuận qua đêm (%) cho đầu tư')
ON CONFLICT (key) DO NOTHING;

