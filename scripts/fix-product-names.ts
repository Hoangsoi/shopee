/**
 * Script để kiểm tra và thêm tên cho các sản phẩm chưa có tên
 * Chạy: npx tsx scripts/fix-product-names.ts
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

// Đọc DATABASE_URL từ .env.local
let DATABASE_URL: string | undefined;

try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/DATABASE_URL=(.+)/);
    if (match) {
      DATABASE_URL = match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
} catch (error) {
  console.error('Lỗi khi đọc .env.local:', error);
}

if (!DATABASE_URL) {
  DATABASE_URL = process.env.DATABASE_URL;
}

if (!DATABASE_URL) {
  console.error('❌ Lỗi: Không tìm thấy DATABASE_URL trong .env.local hoặc biến môi trường');
  console.error('Vui lòng tạo file .env.local và thêm DATABASE_URL');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Hàm tạo tên sản phẩm từ slug hoặc thông tin khác
function generateProductName(product: any): string {
  // Nếu có slug, chuyển đổi slug thành tên
  if (product.slug && product.slug.trim()) {
    // Chuyển slug thành tên đẹp hơn
    // Ví dụ: "my-pham-1" -> "Mỹ Phẩm 1"
    let name = product.slug
      .split('-')
      .filter((word: string) => word.trim().length > 0)
      .map((word: string) => {
        // Chuyển đổi một số từ thường gặp
        const wordMap: { [key: string]: string } = {
          'my': 'Mỹ',
          'pham': 'Phẩm',
          'dien': 'Điện',
          'tu': 'Tử',
          'lanh': 'Lạnh',
          'cao': 'Cao',
          'cap': 'Cấp',
          'vip': 'VIP',
          'san': 'Sản',
          'pham': 'Phẩm',
          'ao': 'Áo',
          'quan': 'Quần',
          'giay': 'Giày',
          'dep': 'Dép',
          'tui': 'Túi',
          'balo': 'Balo',
          'dong': 'Đồng',
          'ho': 'Hồ',
          'nuoc': 'Nước',
          'thuc': 'Thức',
          'an': 'Ăn',
          'do': 'Đồ',
          'choi': 'Chơi',
        };
        
        const lowerWord = word.toLowerCase();
        if (wordMap[lowerWord]) {
          return wordMap[lowerWord];
        }
        
        // Viết hoa chữ cái đầu
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
    
    // Nếu tên quá dài, cắt ngắn
    if (name.length > 100) {
      name = name.substring(0, 100).trim();
    }
    
    // Đảm bảo tên không rỗng
    if (name.trim().length > 0) {
      return name.trim();
    }
  }
  
  // Nếu có description, lấy một phần description
  if (product.description && product.description.trim().length > 0) {
    const desc = product.description.trim();
    // Lấy 100 ký tự đầu và cắt ở từ cuối cùng
    if (desc.length > 100) {
      const shortDesc = desc.substring(0, 100);
      const lastSpace = shortDesc.lastIndexOf(' ');
      if (lastSpace > 50) {
        return shortDesc.substring(0, lastSpace).trim() + '...';
      }
      return shortDesc.trim() + '...';
    }
    return desc;
  }
  
  // Nếu có category, dùng tên category
  if (product.category_name && product.category_name.trim()) {
    return `${product.category_name.trim()} - Sản phẩm #${product.id}`;
  }
  
  // Mặc định
  return `Sản phẩm #${product.id}`;
}

async function fixProductNames() {
  console.log('🔍 Đang kiểm tra danh sách sản phẩm chưa có tên...\n');

  try {
    // Tìm các sản phẩm có name là NULL hoặc chuỗi rỗng
    const productsWithoutName = await sql`
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.category_id,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.name IS NULL 
         OR TRIM(p.name) = ''
         OR LENGTH(TRIM(p.name)) = 0
      ORDER BY p.id
    `;

    if (productsWithoutName.length === 0) {
      console.log('✅ Tất cả sản phẩm đều đã có tên!');
      return;
    }

    console.log(`📋 Tìm thấy ${productsWithoutName.length} sản phẩm chưa có tên:\n`);

    let updated = 0;
    let failed = 0;

    for (const product of productsWithoutName) {
      try {
        const newName = generateProductName(product);
        
        console.log(`   ID ${product.id}: "${product.name || '(trống)'}" -> "${newName}"`);
        
        await sql`
          UPDATE products 
          SET name = ${newName}, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ${product.id}
        `;
        
        updated++;
      } catch (error: any) {
        console.error(`   ❌ Lỗi khi cập nhật sản phẩm ID ${product.id}:`, error.message);
        failed++;
      }
    }

    console.log('\n📊 Tổng kết:');
    console.log(`   ✅ Đã cập nhật: ${updated} sản phẩm`);
    if (failed > 0) {
      console.log(`   ❌ Lỗi: ${failed} sản phẩm`);
    }

    // Kiểm tra lại để xác nhận
    const remaining = await sql`
      SELECT COUNT(*)::int as count 
      FROM products 
      WHERE name IS NULL 
         OR TRIM(name) = ''
         OR LENGTH(TRIM(name)) = 0
    `;

    if (remaining[0].count === 0) {
      console.log('\n🎉 Hoàn thành! Tất cả sản phẩm đã có tên.');
    } else {
      console.log(`\n⚠️  Vẫn còn ${remaining[0].count} sản phẩm chưa có tên.`);
    }

  } catch (error) {
    console.error('\n❌ Lỗi khi kiểm tra sản phẩm:', error);
    if (error instanceof Error) {
      console.error('Chi tiết lỗi:', error.message);
    }
    process.exit(1);
  }
}

// Chạy script
fixProductNames();

