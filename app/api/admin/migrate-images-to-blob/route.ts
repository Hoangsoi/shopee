import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { put } from '@vercel/blob';

// POST: Migrate base64 images to Vercel Blob
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    // Kiểm tra token
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({
        error: 'BLOB_READ_WRITE_TOKEN chưa được cấu hình trong Vercel',
        note: 'Vui lòng thêm token trong Vercel Dashboard → Settings → Environment Variables',
      }, { status: 400 });
    }

    const results = {
      banners: { total: 0, migrated: 0, skipped: 0, errors: 0 },
      products: { total: 0, migrated: 0, skipped: 0, errors: 0 },
    };

    // Migrate banners
    try {
      const banners = await sql`
        SELECT id, image_url, title
        FROM banners
        WHERE image_url LIKE 'data:image/%'
        ORDER BY id
      `;

      results.banners.total = banners.length;

      for (const banner of banners) {
        try {
          const base64Match = banner.image_url.match(/^data:image\/(\w+);base64,(.+)$/);
          if (!base64Match) {
            results.banners.skipped++;
            continue;
          }

          const [, imageType, base64Data] = base64Match;
          const buffer = Buffer.from(base64Data, 'base64');
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(2, 8);
          const filename = `banners/${banner.id}-${timestamp}-${randomStr}.${imageType}`;

          // Upload lên Vercel Blob
          const blob = await put(filename, buffer, {
            access: 'public',
            contentType: `image/${imageType}`,
          });

          // Cập nhật database
          await sql`
            UPDATE banners
            SET image_url = ${blob.url}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${banner.id}
          `;

          results.banners.migrated++;
          console.log(`✅ Migrated banner ${banner.id}: ${blob.url}`);
        } catch (error: any) {
          results.banners.errors++;
          console.error(`❌ Error migrating banner ${banner.id}:`, error?.message || error);
        }
      }
    } catch (error: any) {
      console.error('Error fetching banners:', error);
    }

    // Migrate products
    try {
      const products = await sql`
        SELECT id, image_url, name
        FROM products
        WHERE image_url LIKE 'data:image/%'
        ORDER BY id
      `;

      results.products.total = products.length;

      for (const product of products) {
        try {
          const base64Match = product.image_url.match(/^data:image\/(\w+);base64,(.+)$/);
          if (!base64Match) {
            results.products.skipped++;
            continue;
          }

          const [, imageType, base64Data] = base64Match;
          const buffer = Buffer.from(base64Data, 'base64');
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(2, 8);
          const filename = `products/${product.id}-${timestamp}-${randomStr}.${imageType}`;

          // Upload lên Vercel Blob
          const blob = await put(filename, buffer, {
            access: 'public',
            contentType: `image/${imageType}`,
          });

          // Cập nhật database
          await sql`
            UPDATE products
            SET image_url = ${blob.url}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${product.id}
          `;

          results.products.migrated++;
          console.log(`✅ Migrated product ${product.id}: ${blob.url}`);
        } catch (error: any) {
          results.products.errors++;
          console.error(`❌ Error migrating product ${product.id}:`, error?.message || error);
        }
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
    }

    const totalMigrated = results.banners.migrated + results.products.migrated;
    const totalErrors = results.banners.errors + results.products.errors;

    return NextResponse.json({
      success: true,
      message: `Migration hoàn tất! Đã migrate ${totalMigrated} ảnh lên Vercel Blob.`,
      results,
      summary: {
        totalMigrated,
        totalErrors,
        totalSkipped: results.banners.skipped + results.products.skipped,
      },
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi migrate ảnh', details: error?.message || error },
      { status: 500 }
    );
  }
}

