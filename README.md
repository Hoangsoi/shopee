# Đại Lý Shopee - Hệ thống Đăng ký & Đăng nhập

Ứng dụng web đăng ký và đăng nhập được xây dựng với Next.js 14, TypeScript, Tailwind CSS và Neon PostgreSQL.

## Tính năng

- ✅ Đăng ký tài khoản mới
- ✅ Đăng nhập
- ✅ Đăng xuất
- ✅ Bảo vệ routes với authentication
- ✅ Responsive design
- ✅ Tích hợp với Neon PostgreSQL
- ✅ Sẵn sàng deploy lên Vercel

## Công nghệ sử dụng

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Neon PostgreSQL
- **Authentication**: JWT với httpOnly cookies
- **Password Hashing**: bcryptjs

## Cài đặt

1. Clone repository hoặc tải xuống project

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env.local` trong thư mục gốc:
```env
DATABASE_URL=your_neon_database_url
JWT_SECRET=your_secret_key_here
```

4. Thiết lập database:
   - Tạo tài khoản tại [Neon](https://neon.tech)
   - Tạo database mới
   - Copy connection string và thêm vào `DATABASE_URL`
   - Chạy SQL script từ file `lib/db-setup.sql` trong Neon SQL Editor

5. Chạy development server:
```bash
npm run dev
```

6. Mở [http://localhost:3000](http://localhost:3000) trong trình duyệt

## Deploy lên Vercel

### Bước 1: Chuẩn bị

1. Đảm bảo code đã được push lên GitHub/GitLab/Bitbucket

2. Tạo tài khoản tại [Vercel](https://vercel.com) nếu chưa có

### Bước 2: Deploy

1. Đăng nhập vào Vercel Dashboard
2. Click "New Project"
3. Import repository của bạn
4. Cấu hình project:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build` (mặc định)
   - **Output Directory**: `.next` (mặc định)
   - **Install Command**: `npm install` (mặc định)

### Bước 3: Environment Variables

Thêm các biến môi trường trong Vercel Dashboard:

1. Vào Settings > Environment Variables
2. Thêm các biến sau:
   - `DATABASE_URL`: Connection string từ Neon
   - `JWT_SECRET`: Một chuỗi ngẫu nhiên bảo mật (ví dụ: generate bằng `openssl rand -base64 32`)

### Bước 4: Deploy

1. Click "Deploy"
2. Đợi quá trình build và deploy hoàn tất
3. Truy cập URL được cung cấp

## Cấu trúc thư mục

```
dailyshopee/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── login/
│   │       ├── register/
│   │       ├── logout/
│   │       └── me/
│   ├── login/
│   ├── register/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   └── db-setup.sql
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
└── vercel.json
```

## API Endpoints

### POST `/api/auth/register`
Đăng ký tài khoản mới

**Body:**
```json
{
  "name": "Tên người dùng",
  "email": "user@example.com",
  "password": "password123"
}
```

### POST `/api/auth/login`
Đăng nhập

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### POST `/api/auth/logout`
Đăng xuất

### GET `/api/auth/me`
Lấy thông tin user hiện tại (yêu cầu authentication)

## Lưu ý

- Đảm bảo `JWT_SECRET` là một chuỗi ngẫu nhiên và bảo mật
- Không commit file `.env.local` lên Git
- Database connection string từ Neon có thể thay đổi, cập nhật lại nếu cần
- Vercel sẽ tự động build và deploy khi có thay đổi trên branch chính

## License

MIT

