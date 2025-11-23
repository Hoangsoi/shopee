import sql from './db';

/**
 * Tính VIP level dựa trên tổng số tiền đã nạp và các ngưỡng VIP
 * @param totalDeposit - Tổng số tiền đã nạp
 * @param thresholds - Mảng các ngưỡng VIP (ví dụ: [50000000, 150000000, ...])
 * @returns VIP level (0-10)
 */
export function calculateVipLevel(totalDeposit: number, thresholds: number[]): number {
  // Sắp xếp thresholds theo thứ tự tăng dần
  const sortedThresholds = [...thresholds].sort((a, b) => a - b);
  
  // Tìm level phù hợp
  for (let i = 0; i < sortedThresholds.length; i++) {
    if (totalDeposit < sortedThresholds[i]) {
      return i; // VIP level = index của threshold đầu tiên mà totalDeposit < threshold
    }
  }
  
  // Nếu totalDeposit >= tất cả thresholds, trả về level cao nhất
  return Math.min(sortedThresholds.length, 10);
}

/**
 * Cập nhật VIP level cho user dựa trên tổng số tiền đã nạp
 * @param userId - ID của user cần cập nhật
 */
export async function updateVipStatus(userId: number): Promise<void> {
  try {
    // Kiểm tra xem cột vip_level có tồn tại không
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'vip_level'
    `;

    if (columns.length === 0) {
      // Thêm cột vip_level nếu chưa có
      await sql`ALTER TABLE users ADD COLUMN vip_level INTEGER DEFAULT 0`;
      
      // Nếu có cột is_vip cũ, migrate dữ liệu
      const oldColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_vip'
      `;
      
      if (oldColumns.length > 0) {
        // Chuyển đổi is_vip (true/false) sang vip_level (1/0)
        await sql`
          UPDATE users 
          SET vip_level = CASE WHEN is_vip = true THEN 1 ELSE 0 END
        `;
      }
    }

    // Lấy các ngưỡng VIP từ settings
    const vipThresholdsResult = await sql`
      SELECT value FROM settings 
      WHERE key = 'vip_thresholds'
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    let thresholds: number[] = [];
    if (vipThresholdsResult.length > 0) {
      try {
        thresholds = JSON.parse(vipThresholdsResult[0].value);
        if (!Array.isArray(thresholds)) {
          thresholds = [];
        }
      } catch (e) {
        console.error('Error parsing VIP thresholds:', e);
        thresholds = [];
      }
    }

    // Tính tổng số tiền đã nạp (chỉ tính các transaction deposit đã completed)
    const depositResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_deposit
      FROM transactions
      WHERE user_id = ${userId}
        AND type = 'deposit'
        AND status = 'completed'
    `;

    const totalDeposit = parseFloat(depositResult[0]?.total_deposit?.toString() || '0');
    const vipLevel = calculateVipLevel(totalDeposit, thresholds);

    // Cập nhật VIP level
    await sql`
      UPDATE users 
      SET vip_level = ${vipLevel}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${userId}
    `;

    console.log(`Updated VIP level for user ${userId}: level=${vipLevel}, totalDeposit=${totalDeposit}, thresholds=${JSON.stringify(thresholds)}`);
  } catch (error) {
    console.error('Error updating VIP status:', error);
    // Không throw error để không làm gián đoạn flow chính
  }
}

