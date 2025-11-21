import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET: Hiển thị trang HTML với nút chạy migration
export async function GET(request: NextRequest) {
  try {
    // Kiểm tra các bảng và cột hiện có
    const usersColumns = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;

    const settingsColumns = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'settings'
      ORDER BY ordinal_position
    `;

    const validAgentCode = await sql`
      SELECT value FROM settings WHERE key = 'valid_agent_code'
    `;

    const hasRoleColumn = usersColumns.some((col: any) => col.column_name === 'role');

    // Trả về HTML page
    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Migration Database</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
  <div class="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
    <h1 class="text-3xl font-bold text-orange-600 mb-6">Migration Database</h1>
    
    <div class="mb-6">
      <p class="text-gray-600 mb-4">Click nút bên dưới để tự động cập nhật tất cả các bảng và cột lên Neon database.</p>
      <button 
        id="migrateBtn"
        onclick="runMigration()"
        class="w-full px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        🚀 CHẠY MIGRATION
      </button>
    </div>

    <div id="result" class="hidden"></div>
    <div id="error" class="hidden"></div>

    <div class="mt-6 pt-6 border-t border-gray-200">
      <h2 class="text-lg font-semibold mb-4">📊 Trạng thái hiện tại:</h2>
      <div class="space-y-4 text-sm">
        <div>
          <strong>Bảng users:</strong> ${usersColumns.length} cột
          ${hasRoleColumn ? '<span class="text-green-600 ml-2">✓ Có cột role</span>' : '<span class="text-red-600 ml-2">✗ Thiếu cột role</span>'}
        </div>
        <div>
          <strong>Bảng settings:</strong> ${settingsColumns.length} cột
        </div>
        <div>
          <strong>Mã đại lý hiện tại:</strong> <span class="font-mono text-orange-600">${validAgentCode.length > 0 ? validAgentCode[0].value : 'Chưa có'}</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    async function runMigration() {
      const btn = document.getElementById('migrateBtn');
      const resultDiv = document.getElementById('result');
      const errorDiv = document.getElementById('error');
      
      btn.disabled = true;
      btn.textContent = 'Đang migration...';
      resultDiv.classList.add('hidden');
      errorDiv.classList.add('hidden');

      try {
        const response = await fetch('/api/migrate-db', { method: 'POST' });
        const data = await response.json();

        if (response.ok && data.success) {
          resultDiv.className = 'bg-green-50 border border-green-200 text-green-600 py-3 px-4 rounded-lg mb-4';
          resultDiv.innerHTML = \`
            <strong>✅ \${data.message}</strong>
            \${data.addedColumns && data.addedColumns.length > 0 ? 
              '<div class="mt-2">Đã thêm các cột: ' + data.addedColumns.join(', ') + '</div>' : 
              '<div class="mt-2">Tất cả cột đã tồn tại</div>'
            }
            <div class="mt-4">
              <strong>Bảng users:</strong> \${data.tables.users.count} cột<br>
              <strong>Bảng settings:</strong> \${data.tables.settings.count} cột<br>
              <strong>Mã đại lý:</strong> \${data.currentAgentCode}
            </div>
          \`;
          resultDiv.classList.remove('hidden');
          
          // Reload sau 2 giây để cập nhật trạng thái
          setTimeout(() => location.reload(), 2000);
        } else {
          errorDiv.className = 'bg-red-50 border border-red-200 text-red-600 py-3 px-4 rounded-lg mb-4';
          errorDiv.innerHTML = \`<strong>Lỗi:</strong> \${data.error || data.details || 'Migration thất bại'}\`;
          errorDiv.classList.remove('hidden');
        }
      } catch (error) {
        errorDiv.className = 'bg-red-50 border border-red-200 text-red-600 py-3 px-4 rounded-lg mb-4';
        errorDiv.innerHTML = '<strong>Lỗi:</strong> Có lỗi xảy ra khi kết nối đến server';
        errorDiv.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = '🚀 CHẠY MIGRATION';
      }
    }
  </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Migration Database</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
  <div class="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
    <h1 class="text-3xl font-bold text-orange-600 mb-6">Migration Database</h1>
    <div class="bg-yellow-50 border border-yellow-200 text-yellow-600 py-3 px-4 rounded-lg">
      <strong>Thông báo:</strong> Chưa có bảng nào được tạo. Hãy chạy migration để tạo database.
    </div>
    <button 
      onclick="runMigration()"
      class="w-full mt-4 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
    >
      🚀 CHẠY MIGRATION
    </button>
  </div>
  <script>
    async function runMigration() {
      const btn = event.target;
      btn.disabled = true;
      btn.textContent = 'Đang migration...';
      try {
        const response = await fetch('/api/migrate-db', { method: 'POST' });
        const data = await response.json();
        if (response.ok && data.success) {
          alert('Migration thành công! Trang sẽ reload...');
          location.reload();
        } else {
          alert('Lỗi: ' + (data.error || 'Migration thất bại'));
        }
      } catch (error) {
        alert('Lỗi kết nối');
      } finally {
        btn.disabled = false;
        btn.textContent = '🚀 CHẠY MIGRATION';
      }
    }
  </script>
</body>
</html>
    `;
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
}

// POST: Chạy migration
export async function POST() {
  try {
    console.log('Bắt đầu migration database...');

    // 1. Tạo bảng users với đầy đủ cột
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        phone VARCHAR(20),
        agent_code VARCHAR(50),
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Bảng users đã được tạo/cập nhật');

    // 2. Kiểm tra và thêm các cột cần thiết nếu bảng users đã tồn tại
    const addedColumns: string[] = [];

    // Thêm cột phone
    try {
      const checkPhone = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone'
      `;
      if (checkPhone.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN phone VARCHAR(20)`;
        addedColumns.push('phone');
        console.log('✓ Đã thêm cột phone vào bảng users');
      }
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (!errorMsg.includes('already exists') && !errorMsg.includes('duplicate') && !errorMsg.includes('column')) {
        console.error('Lỗi khi thêm cột phone:', error);
      }
    }

    // Thêm cột agent_code
    try {
      const checkAgentCode = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'agent_code'
      `;
      if (checkAgentCode.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN agent_code VARCHAR(50)`;
        addedColumns.push('agent_code');
        console.log('✓ Đã thêm cột agent_code vào bảng users');
      }
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (!errorMsg.includes('already exists') && !errorMsg.includes('duplicate') && !errorMsg.includes('column')) {
        console.error('Lỗi khi thêm cột agent_code:', error);
      }
    }

    // Thêm cột role
    try {
      const checkRole = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
      `;
      if (checkRole.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'`;
        addedColumns.push('role');
        console.log('✓ Đã thêm cột role vào bảng users');
      }
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (!errorMsg.includes('already exists') && !errorMsg.includes('duplicate') && !errorMsg.includes('column')) {
        console.error('Lỗi khi thêm cột role:', error);
      }
    }

    // Cập nhật role cho các user hiện có nếu NULL
    try {
      await sql`UPDATE users SET role = 'user' WHERE role IS NULL`;
    } catch (error) {
      // Ignore if column doesn't exist yet
    }

    // 3. Tạo index cho users
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`;
    console.log('✓ Index cho bảng users đã được tạo');

    // 4. Tạo bảng settings
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Bảng settings đã được tạo');

    // 5. Thêm mã đại lý mặc định vào settings
    await sql`
      INSERT INTO settings (key, value, description) 
      VALUES ('valid_agent_code', 'SH6688', 'Mã đại lý hợp lệ để đăng ký')
      ON CONFLICT (key) DO NOTHING
    `;
    console.log('✓ Mã đại lý mặc định đã được thêm vào settings');

    // 6. Kiểm tra kết quả
    const usersColumns = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;

    const settingsColumns = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'settings'
      ORDER BY ordinal_position
    `;

    const validAgentCode = await sql`
      SELECT value FROM settings WHERE key = 'valid_agent_code'
    `;

    return NextResponse.json({
      success: true,
      message: 'Migration database thành công!',
      addedColumns: addedColumns,
      tables: {
        users: {
          columns: usersColumns,
          count: usersColumns.length,
        },
        settings: {
          columns: settingsColumns,
          count: settingsColumns.length,
        },
      },
      currentAgentCode: validAgentCode.length > 0 ? validAgentCode[0].value : 'SH6688',
    });
  } catch (error) {
    console.error('Migration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi migration database',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

