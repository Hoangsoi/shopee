/**
 * Script để thêm 20 sản phẩm mẫu cho mỗi danh mục vào database
 * Chạy: npx tsx scripts/add-sample-products.ts
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
  DATABASE_URL = process.env.DATABASE_URL;
}

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL không được tìm thấy trong .env.local');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Tạo danh sách 20 sản phẩm cho mỗi danh mục
const generateProducts = (category: string, baseIndex: number) => {
  const products = [];
  const images = [
    'https://images.unsplash.com/photo-1556228578-0d85b1a4d571',
    'https://images.unsplash.com/photo-1586495777744-4413f21062fa',
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be',
    'https://images.unsplash.com/photo-1556228720-195a672e8a03',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1',
    'https://images.unsplash.com/photo-1609091839311-d5365f90be93',
    'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb',
    'https://images.unsplash.com/photo-1571172968086-4c81a9c5bcc2',
  ];

  const categoryNames: { [key: string]: string[] } = {
    'Mỹ phẩm': [
      'Kem dưỡng da', 'Son môi', 'Serum vitamin C', 'Mặt nạ dưỡng ẩm', 'Kem chống nắng',
      'Toner cân bằng da', 'Essence tái tạo', 'Kem mắt chống lão hóa', 'Sữa rửa mặt', 'Tẩy tế bào chết',
      'Kem dưỡng ban đêm', 'Xịt khoáng', 'Kem dưỡng tay', 'Dầu dưỡng tóc', 'Mặt nạ đất sét',
      'Kem dưỡng body', 'Nước hoa hồng', 'Kem chống nắng dạng xịt', 'Serum retinol', 'Kem dưỡng collagen',
      'Kem dưỡng trắng da', 'Tinh chất hyaluronic', 'Kem dưỡng chống lão hóa', 'Mặt nạ giấy', 'Kem dưỡng môi',
      'Serum niacinamide', 'Kem dưỡng ban ngày', 'Toner se khít lỗ chân lông', 'Kem dưỡng chống nắng', 'Mặt nạ than hoạt tính',
      'Kem dưỡng tế bào gốc', 'Serum peptide', 'Kem dưỡng vitamin E', 'Mặt nạ collagen', 'Kem dưỡng chống thâm',
      'Toner làm sáng da', 'Kem dưỡng chống nhăn', 'Serum AHA/BHA', 'Mặt nạ dưỡng ẩm sâu', 'Kem dưỡng chống nám'
    ],
    'Điện tử': [
      'Điện thoại thông minh', 'Tai nghe không dây', 'Loa Bluetooth', 'Sạc dự phòng', 'Ốp lưng điện thoại',
      'Pin sạc nhanh', 'Cáp sạc USB-C', 'Bàn phím cơ', 'Chuột không dây', 'Webcam HD',
      'Microphone USB', 'Ổ cứng di động', 'USB flash drive', 'Thẻ nhớ SD', 'Adapter HDMI',
      'Hub USB-C', 'Bộ sạc đa năng', 'Giá đỡ điện thoại', 'Bao da máy tính', 'Bàn phím số',
      'Màn hình máy tính', 'Bàn phím gaming', 'Chuột gaming', 'Tay cầm chơi game', 'Bộ phát WiFi',
      'Router không dây', 'Switch mạng', 'Camera an ninh', 'Ổ cứng SSD', 'RAM máy tính',
      'Card đồ họa', 'Bộ tản nhiệt CPU', 'Quạt case', 'Nguồn máy tính', 'Case máy tính',
      'Bàn phím không dây', 'Chuột trackball', 'Bàn di chuột', 'Giá đỡ laptop', 'Bộ chia HDMI',
      'Converter USB-C', 'Hub đa cổng', 'Bộ sạc từ tính', 'Pin thay thế', 'Màn hình phụ'
    ],
    'Điện lạnh': [
      'Tủ lạnh mini', 'Máy lạnh 1HP', 'Quạt điều hòa', 'Máy lọc không khí', 'Bình nước nóng lạnh',
      'Máy sưởi điện', 'Quạt đứng', 'Quạt trần', 'Máy hút ẩm', 'Máy tạo ẩm',
      'Tủ đông mini', 'Máy làm đá', 'Quạt cây', 'Máy lọc nước', 'Bình giữ nhiệt',
      'Máy sấy tóc', 'Máy uốn tóc', 'Máy ép tóc', 'Máy massage', 'Đèn sưởi nhà tắm',
      'Máy lạnh 1.5HP', 'Máy lạnh 2HP', 'Tủ lạnh side-by-side', 'Tủ lạnh ngăn đá trên', 'Máy giặt cửa trước',
      'Máy giặt cửa trên', 'Máy sấy quần áo', 'Máy rửa bát', 'Lò vi sóng', 'Lò nướng điện',
      'Bếp từ', 'Bếp hồng ngoại', 'Máy hút bụi', 'Máy hút bụi cầm tay', 'Máy lau sàn',
      'Quạt hơi nước', 'Quạt treo tường', 'Máy lọc nước RO', 'Máy nước nóng năng lượng mặt trời', 'Bình nóng lạnh',
      'Máy lọc không khí mini', 'Máy tạo ẩm phun sương', 'Máy hút ẩm công nghiệp', 'Quạt thông gió', 'Máy điều hòa di động'
    ],
    'Cao cấp': [
      'Đồng hồ cao cấp', 'Túi xách da thật', 'Giày thể thao cao cấp', 'Kính mát thương hiệu', 'Ví da cao cấp',
      'Áo khoác da', 'Balo cao cấp', 'Thắt lưng da', 'Vòng tay vàng', 'Nhẫn kim cương',
      'Dây chuyền bạc', 'Bông tai vàng', 'Đồng hồ thông minh', 'Máy ảnh DSLR', 'Ống kính camera',
      'Máy quay phim', 'Máy nghe nhạc cao cấp', 'Loa hi-end', 'Ampli công suất', 'Đàn piano điện',
      'Đồng hồ cơ tự động', 'Túi xách hàng hiệu', 'Giày da Italy', 'Kính mát Ray-Ban', 'Ví da bò',
      'Áo khoác lông thú', 'Balo da thật', 'Thắt lưng da cá sấu', 'Vòng cổ vàng 18K', 'Nhẫn đính hôn',
      'Dây chuyền vàng trắng', 'Bông tai kim cương', 'Đồng hồ Thụy Sĩ', 'Máy ảnh mirrorless', 'Ống kính zoom',
      'Máy quay 4K', 'Tai nghe cao cấp', 'Loa không dây', 'Ampli tube', 'Đàn guitar điện',
      'Đồng hồ tourbillon', 'Túi xách Hermes', 'Giày sneaker cao cấp', 'Kính mát Gucci', 'Ví da cá sấu'
    ],
    'VIP': [
      'Gói VIP Premium', 'Dịch vụ VIP 1 năm', 'Thẻ thành viên VIP', 'Gói VIP Gold', 'Gói VIP Platinum',
      'Dịch vụ chăm sóc VIP', 'Ưu đãi độc quyền VIP', 'Gói tích điểm VIP', 'Chương trình khách hàng thân thiết', 'Thẻ tín dụng VIP',
      'Bảo hiểm VIP', 'Dịch vụ tư vấn VIP', 'Gói hỗ trợ 24/7', 'Ưu tiên giao hàng VIP', 'Giảm giá đặc biệt VIP',
      'Sự kiện độc quyền VIP', 'Quà tặng sinh nhật VIP', 'Chương trình tri ân VIP', 'Dịch vụ đổi trả VIP', 'Hỗ trợ kỹ thuật VIP',
      'Gói VIP Diamond', 'Dịch vụ VIP trọn đời', 'Thẻ VIP đặc biệt', 'Gói VIP Executive', 'Gói VIP Corporate',
      'Dịch vụ tư vấn cá nhân VIP', 'Ưu đãi mua sắm VIP', 'Gói tích lũy điểm VIP', 'Chương trình khách hàng vàng', 'Thẻ VIP hạng cao',
      'Bảo hiểm sức khỏe VIP', 'Dịch vụ chăm sóc khách hàng VIP', 'Gói hỗ trợ chuyên nghiệp', 'Giao hàng siêu tốc VIP', 'Giảm giá cực sốc VIP',
      'Sự kiện riêng tư VIP', 'Quà tặng đặc biệt VIP', 'Chương trình khuyến mãi VIP', 'Dịch vụ bảo hành VIP', 'Hỗ trợ tận tâm VIP'
    ],
  };

  const names = categoryNames[category] || [];
  const basePrices: { [key: string]: { min: number; max: number } } = {
    'Mỹ phẩm': { min: 100000, max: 500000 },
    'Điện tử': { min: 500000, max: 10000000 },
    'Điện lạnh': { min: 2000000, max: 15000000 },
    'Cao cấp': { min: 2000000, max: 50000000 },
    'VIP': { min: 2000000, max: 20000000 },
  };

  const priceRange = basePrices[category] || { min: 100000, max: 1000000 };

  for (let i = 0; i < 30; i++) {
    const name = names[i] || `${category} Sản phẩm ${i + 1}`;
    const slug = `${category.toLowerCase().replace(/\s+/g, '-')}-${i + 1}-${Date.now()}-${baseIndex + i}`;
    const price = Math.floor(Math.random() * (priceRange.max - priceRange.min) + priceRange.min);
    const originalPrice = price + Math.floor(Math.random() * price * 0.3);
    const image = images[i % images.length];

    products.push({
      name,
      slug,
      price,
      original_price: originalPrice,
      category,
      image,
    });
  }

  return products;
};

async function addSampleProducts() {
  console.log('🚀 Bắt đầu thêm sản phẩm mẫu (30 sản phẩm mỗi danh mục)...\n');

  try {
    // Lấy danh sách categories
    const categories = await sql`
      SELECT id, name FROM categories ORDER BY sort_order
    `;

    if (categories.length === 0) {
      console.error('❌ Chưa có categories. Vui lòng chạy migration trước!');
      console.log('   Chạy: npm run setup-db hoặc truy cập /api/migrate-db');
      process.exit(1);
    }

    const categoryMap: { [key: string]: number } = {};
    categories.forEach((cat: any) => {
      categoryMap[cat.name] = cat.id;
    });

    let totalAdded = 0;
    let totalSkipped = 0;

    // Thêm 30 sản phẩm cho mỗi danh mục
    for (const category of categories) {
      const categoryName = category.name;
      console.log(`\n📦 Đang thêm sản phẩm cho danh mục: ${categoryName}`);
      
      const products = generateProducts(categoryName, totalAdded);
      let added = 0;
      let skipped = 0;

      for (const product of products) {
        try {
          // Kiểm tra xem sản phẩm đã tồn tại chưa
          const existing = await sql`
            SELECT id FROM products WHERE slug = ${product.slug}
          `;

          if (existing.length > 0) {
            skipped++;
            continue;
          }

          // Thêm sản phẩm
          const isFeatured = Math.random() > 0.7;
          const stock = Math.floor(Math.random() * 200) + 50;
          
          await sql`
            INSERT INTO products (name, slug, price, original_price, image_url, category_id, is_featured, is_active, stock)
            VALUES (
              ${product.name},
              ${product.slug},
              ${product.price},
              ${product.original_price},
              ${product.image},
              ${category.id},
              ${isFeatured},
              true,
              ${stock}
            )
          `;

          added++;
          totalAdded++;
        } catch (error: any) {
          console.error(`❌ Lỗi khi thêm ${product.name}:`, error.message);
          skipped++;
          totalSkipped++;
        }
      }

      console.log(`   ✅ Đã thêm: ${added} sản phẩm`);
      console.log(`   ⏭️  Đã bỏ qua: ${skipped} sản phẩm`);
    }

    console.log('\n📊 Tổng kết:');
    console.log(`   ✅ Tổng đã thêm: ${totalAdded} sản phẩm`);
    console.log(`   ⏭️  Tổng đã bỏ qua: ${totalSkipped} sản phẩm`);

    // Kiểm tra tổng số sản phẩm
    const totalProducts = await sql`SELECT COUNT(*)::int as count FROM products`;
    const productsByCategory = await sql`
      SELECT c.name, COUNT(p.id) as count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id, c.name
      ORDER BY c.sort_order
    `;

    console.log(`\n🎉 Hoàn thành! Tổng số sản phẩm trong database: ${totalProducts[0].count}`);
    console.log('\n📈 Số sản phẩm theo danh mục:');
    productsByCategory.forEach((row: any) => {
      console.log(`   - ${row.name}: ${row.count} sản phẩm`);
    });

  } catch (error) {
    console.error('\n❌ Lỗi khi thêm sản phẩm:', error);
    if (error instanceof Error) {
      console.error('Chi tiết lỗi:', error.message);
    }
    process.exit(1);
  }
}

// Chạy script
addSampleProducts();
