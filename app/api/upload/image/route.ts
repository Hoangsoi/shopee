import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { z } from 'zod';
import { put } from '@vercel/blob';

const uploadSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
  filename: z.string().optional(),
  folder: z.enum(['products', 'banners', 'categories']).optional(),
});

// POST: Upload image sử dụng Vercel Blob Storage
// Hỗ trợ base64, URL, và file upload
export async function POST(request: NextRequest) {
  try {
    // Chỉ admin mới có thể upload
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = uploadSchema.parse(body);

    const { image, filename, folder } = validatedData;

    // Nếu là URL, trả về luôn (không cần xử lý)
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return NextResponse.json({
        success: true,
        url: image,
        message: 'URL image được chấp nhận',
      });
    }

    // Nếu là base64, upload lên Vercel Blob
    if (image.startsWith('data:image/')) {
      // Validate base64 image
      const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!base64Match) {
        return NextResponse.json(
          { error: 'Định dạng base64 không hợp lệ' },
          { status: 400 }
        );
      }

      const [, imageType, base64Data] = base64Match;
      const allowedTypes = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
      
      if (!allowedTypes.includes(imageType.toLowerCase())) {
        return NextResponse.json(
          { error: `Định dạng ảnh không được hỗ trợ. Chỉ chấp nhận: ${allowedTypes.join(', ')}` },
          { status: 400 }
        );
      }

      // Kiểm tra kích thước (max 5MB)
      const imageSize = (base64Data.length * 3) / 4;
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (imageSize > maxSize) {
        return NextResponse.json(
          { error: 'Kích thước ảnh quá lớn. Tối đa 5MB' },
          { status: 400 }
        );
      }

      // Convert base64 to Buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // Tạo filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const finalFilename = filename 
        ? `${folder || 'uploads'}/${timestamp}-${randomStr}-${filename}`
        : `${folder || 'uploads'}/${timestamp}-${randomStr}.${imageType}`;

      try {
        // Upload lên Vercel Blob
        const blob = await put(finalFilename, buffer, {
          access: 'public',
          contentType: `image/${imageType}`,
        });

        return NextResponse.json({
          success: true,
          url: blob.url,
          message: 'Upload thành công lên Vercel Blob',
        });
      } catch (blobError: any) {
        // Fallback: Nếu Vercel Blob không khả dụng, trả về base64 tạm thời
        if (process.env.NODE_ENV === 'development') {
          console.warn('Vercel Blob upload failed, using base64 fallback:', blobError);
        }

        // Kiểm tra xem có phải lỗi do thiếu token không
        if (blobError?.message?.includes('BLOB_READ_WRITE_TOKEN')) {
          return NextResponse.json(
            { 
              error: 'Vercel Blob chưa được cấu hình. Vui lòng thêm BLOB_READ_WRITE_TOKEN vào environment variables.',
              fallback_url: image, // Trả về base64 tạm thời
            },
            { status: 500 }
          );
        }

        // Fallback về base64 trong development
        if (process.env.NODE_ENV === 'development') {
          return NextResponse.json({
            success: true,
            url: image,
            message: 'Upload thành công (base64 fallback - development mode)',
            note: 'Vercel Blob không khả dụng, đang dùng base64. Thêm BLOB_READ_WRITE_TOKEN để sử dụng Vercel Blob.',
          });
        }

        throw blobError;
      }
    }

    return NextResponse.json(
      { error: 'Định dạng ảnh không hợp lệ. Vui lòng cung cấp URL hoặc base64' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('Upload image error:', error);
    }
    return NextResponse.json(
      { error: 'Lỗi khi upload ảnh' },
      { status: 500 }
    );
  }
}

