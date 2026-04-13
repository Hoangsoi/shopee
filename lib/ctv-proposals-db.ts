import sql from '@/lib/db';

let tablesEnsured = false;

/** Tạo bảng đề xuất CTV (admin gửi — khách xác nhận tab CTV). */
export async function ensureCtvProposalTables(): Promise<void> {
  if (tablesEnsured) return;

  await sql`
    CREATE TABLE IF NOT EXISTS ctv_proposals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reference_code VARCHAR(64) UNIQUE NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'pending',
      total_amount DECIMAL(15, 2) NOT NULL,
      estimated_commission DECIMAL(15, 2) NOT NULL DEFAULT 0,
      payment_method VARCHAR(50),
      shipping_address TEXT,
      notes TEXT,
      order_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_ctv_proposals_user ON ctv_proposals(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ctv_proposals_status ON ctv_proposals(status)`;

  await sql`
    CREATE TABLE IF NOT EXISTS ctv_proposal_items (
      id SERIAL PRIMARY KEY,
      proposal_id INTEGER NOT NULL REFERENCES ctv_proposals(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name VARCHAR(255) NOT NULL,
      product_price DECIMAL(10, 2) NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal DECIMAL(15, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_ctv_proposal_items_proposal ON ctv_proposal_items(proposal_id)`;

  tablesEnsured = true;
}
