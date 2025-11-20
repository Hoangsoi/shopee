'use client'

import { useState } from 'react'

export default function MigratePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleMigrate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/migrate-db', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setResult(data)
      } else {
        setError(data.error || data.details || 'Migration thất bại')
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi kết nối đến server')
      console.error('Migration error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-sm shadow-sm p-8">
          <h1 className="text-2xl font-bold text-[#ee4d2d] mb-6">
            Tự động Migration Database lên Neon
          </h1>

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Click nút bên dưới để tự động cập nhật tất cả các bảng và cột lên Neon database.
            </p>
            <button
              onClick={handleMigrate}
              disabled={loading}
              className="w-full md:w-auto px-8 h-11 bg-[#ee4d2d] text-white rounded-sm font-medium hover:bg-[#f05d40] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Đang migration...' : '🚀 CHẠY MIGRATION'}
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 py-3 px-4 rounded-sm">
              <strong>Lỗi:</strong> {error}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-600 py-3 px-4 rounded-sm">
                <strong>✅ {result.message}</strong>
                {result.addedColumns && result.addedColumns.length > 0 && (
                  <div className="mt-2 text-sm">
                    <strong>Đã thêm các cột:</strong> {result.addedColumns.join(', ')}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">📊 Bảng users:</h3>
                  <div className="bg-gray-50 p-4 rounded-sm">
                    <p className="text-sm mb-2">
                      <strong>Số cột:</strong> {result.tables.users.count}
                    </p>
                    <div className="text-sm space-y-1">
                      {result.tables.users.columns.map((col: any, idx: number) => (
                        <div key={idx} className="flex gap-2">
                          <span className="font-mono text-gray-700">• {col.column_name}</span>
                          <span className="text-gray-500">({col.data_type})</span>
                          {col.character_maximum_length && (
                            <span className="text-gray-400">
                              [{col.character_maximum_length}]
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">📊 Bảng settings:</h3>
                  <div className="bg-gray-50 p-4 rounded-sm">
                    <p className="text-sm mb-2">
                      <strong>Số cột:</strong> {result.tables.settings.count}
                    </p>
                    <div className="text-sm space-y-1">
                      {result.tables.settings.columns.map((col: any, idx: number) => (
                        <div key={idx} className="flex gap-2">
                          <span className="font-mono text-gray-700">• {col.column_name}</span>
                          <span className="text-gray-500">({col.data_type})</span>
                          {col.character_maximum_length && (
                            <span className="text-gray-400">
                              [{col.character_maximum_length}]
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">🔑 Mã đại lý hiện tại:</h3>
                  <div className="bg-blue-50 p-4 rounded-sm">
                    <p className="text-lg font-mono text-[#ee4d2d]">
                      {result.currentAgentCode}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold mb-4">ℹ️ Thông tin</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Migration sẽ tự động tạo tất cả các bảng và cột cần thiết</p>
              <p>• Nếu bảng đã tồn tại, chỉ thêm các cột mới (không mất dữ liệu)</p>
              <p>• Có thể chạy migration nhiều lần an toàn</p>
              <p>• Sau khi migration, kiểm tra lại Neon Dashboard để xác nhận</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

