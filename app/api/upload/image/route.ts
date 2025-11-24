import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { z } from 'zod';

const uploadSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
  filename: z.string().optional(),
  folder: z.enum(['products', 'banners', 'categories']).optional(),
});

// POST: Chấp nhận URL hoặc base64, trả về trực tiếp (không upload lên Vercel)
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

    const { image } = validatedData;

    // Nếu là URL, trả về luôn
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return NextResponse.json({
        success: true,
        url: image,
        message: 'URL image được chấp nhận',
      });
    }

    // Nếu là base64, validate và trả về trực tiếp
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

      // Trả về base64 trực tiếp (lưu vào Neon database)
      return NextResponse.json({
        success: true,
        url: image,
        message: 'Base64 image được chấp nhận',
      });
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
      { error: 'Lỗi khi xử lý ảnh' },
      { status: 500 }
    );
  }
}
