import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import type { Product } from '@/lib/types';

// Hàm tạo số random ổn định dựa trên seed (product_id)
// Đảm bảo cùng sản phẩm sẽ có cùng số random
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate random sales count từ 50-500 dựa trên product_id
function generateRandomSalesCount(productId: number): number {
  const random = seededRandom(productId);
  // Random từ 50 đến 500
  return Math.floor(50 + random * 450);
}

// Generate random rating từ 3.5-5.0 dựa trên product_id
function generateRandomRating(productId: number): number {
  const random = seededRandom(productId + 1000); // Dùng seed khác để rating khác sales_count
  // Random từ 3.5 đến 5.0
  return Math.round((3.5 + random * 1.5) * 10) / 10; // Làm tròn 1 chữ số thập phân
}

export async function GET(request: NextRequest) {
  try {
    // Kiểm tra và thêm cột sales_count và rating nếu chưa có
    try {
      const columns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name IN ('sales_count', 'rating')
      `;
      
      const existingColumns = columns.map((col: any) => col.column_name);
      
      if (!existingColumns.includes('sales_count')) {
        await sql`ALTER TABLE products ADD COLUMN sales_count INTEGER DEFAULT 0`;
      }
      if (!existingColumns.includes('rating')) {
        await sql`ALTER TABLE products ADD COLUMN rating DECIMAL(3, 2) DEFAULT 0`;
      }
    } catch (error: any) {
      // Bỏ qua lỗi nếu cột đã tồn tại
      if (process.env.NODE_ENV === 'development') {
        console.log('Columns may already exist:', error.message);
      }
    }

    // Lấy giá trị cộng thêm cho lượt bán từ settings
    let salesBoost = 0;
    let intervalHours = 0;
    try {
      const boostSetting = await sql`
        SELECT value FROM settings WHERE key = 'sales_boost' LIMIT 1
      `;
      if (boostSetting.length > 0) {
        // Parse JSON nếu có, hoặc fallback về số cũ
        try {
          const config = JSON.parse(boostSetting[0].value);
          salesBoost = config.value || 0;
          intervalHours = config.interval_hours || 0;
        } catch {
          // Nếu không phải JSON, coi như giá trị cũ (chế độ thủ công)
          salesBoost = parseInt(boostSetting[0].value) || 0;
          intervalHours = 0; // Giá trị cũ không có interval, mặc định = 0
        }
      }
    } catch (error) {
      // Nếu chưa có setting, sử dụng giá trị mặc định 0
    }

    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('category_id');
    const featured = searchParams.get('featured');

    let query;
    if (categoryId) {
      // Chỉ lấy sản phẩm có category_id đúng và không NULL
      query = sql`
        SELECT p.*, c.name as category_name, c.discount_percent as category_discount_percent
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.category_id = ${parseInt(categoryId)} 
          AND p.category_id IS NOT NULL
          AND p.is_active = true
          AND c.id IS NOT NULL
        ORDER BY p.created_at DESC
        LIMIT 100
      `;
    } else if (featured === 'true') {
      query = sql`
        SELECT p.*, c.name as category_name, c.discount_percent as category_discount_percent
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_featured = true AND p.is_active = true
        ORDER BY p.created_at DESC
        LIMIT 20
      `;
    } else {
      query = sql`
        SELECT p.*, c.name as category_name, c.discount_percent as category_discount_percent
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = true
        ORDER BY p.created_at DESC
        LIMIT 20
      `;
    }

    const products = await query;

    // Thêm cache headers để tăng tốc độ
    const response = NextResponse.json({
      products: products.map((product): Product => {
        // Nếu sales_count = 0 hoặc null, generate random dựa trên product_id
        let baseSalesCount = product.sales_count ? parseInt(product.sales_count.toString()) : 0;
        if (baseSalesCount === 0) {
          baseSalesCount = generateRandomSalesCount(product.id);
        }
        
        // Chỉ cộng salesBoost khi interval = 0 (chế độ thủ công)
        // Khi interval > 0, giá trị đã được cộng vào database bởi cron job
        const salesCount = intervalHours === 0 ? baseSalesCount + salesBoost : baseSalesCount;
        
        // Nếu rating = 0 hoặc null, generate random dựa trên product_id
        let rating = product.rating ? parseFloat(product.rating.toString()) : 0;
        if (rating === 0) {
          rating = generateRandomRating(product.id);
        }
        
        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: parseFloat(product.price.toString()),
          original_price: product.original_price ? parseFloat(product.original_price.toString()) : undefined,
          image_url: product.image_url,
          category_id: product.category_id,
          category_name: product.category_name,
          discount_percent: product.category_discount_percent ? parseInt(product.category_discount_percent.toString()) : 0,
          is_featured: product.is_featured,
          is_active: product.is_active,
          stock: product.stock ? parseInt(product.stock.toString()) : 0,
          sales_count: salesCount,
          rating: rating,
          created_at: product.created_at,
          updated_at: product.updated_at,
        };
      }),
    });

    // Cache 30 giây cho products
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    
    return response;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get products error:', error);
    }
    return NextResponse.json(
      { error: 'Lỗi khi lấy sản phẩm' },
      { status: 500 }
    );
  }
}

