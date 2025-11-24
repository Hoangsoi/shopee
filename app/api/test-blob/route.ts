import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { put } from '@vercel/blob';

// GET: Test Vercel Blob connection
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    
    if (!hasToken) {
      return NextResponse.json({
        success: false,
        message: 'BLOB_READ_WRITE_TOKEN chưa được cấu hình',
        hasToken: false,
      });
    }

    // Test upload một file nhỏ
    try {
      const testContent = `Test upload at ${new Date().toISOString()}`;
      const blob = await put(`test/test-${Date.now()}.txt`, testContent, {
        access: 'public',
        contentType: 'text/plain',
      });

      return NextResponse.json({
        success: true,
        message: 'Vercel Blob hoạt động bình thường!',
        hasToken: true,
        testUrl: blob.url,
        note: 'Xóa file test này trong Vercel Blob Browser nếu không cần thiết.',
      });
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        message: 'Lỗi khi upload test file',
        hasToken: true,
        error: error?.message || error,
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'Lỗi khi test Vercel Blob',
      error: error?.message || error,
    }, { status: 500 });
  }
}

