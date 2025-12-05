'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface DebugInfo {
  success: boolean
  token?: {
    userId: number
    email: string
    role: string
    roleNormalized: string
  }
  database?: {
    userId: number
    email: string
    name: string
    role: string
    roleNormalized: string
    created_at: string
    updated_at: string
  }
  comparison?: {
    rolesMatch: boolean
    isAdminInToken: boolean
    isAdminInDatabase: boolean
    shouldRedirectToAdmin: boolean
  }
  recommendation?: string
  error?: string
}

export default function DebugRolePage() {
  const router = useRouter()
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDebugInfo()
  }, [])

  const fetchDebugInfo = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/debug-user-role')
      const data = await response.json()
      setDebugInfo(data)
    } catch (error) {
      setDebugInfo({ error: 'Lỗi kết nối đến server' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#ee4d2d] mb-6">
          Debug Role - Kiểm tra quyền Admin
        </h1>

        {debugInfo?.error && (
          <div className="bg-red-50 border border-red-200 text-red-600 py-3 px-4 rounded-lg mb-6">
            {debugInfo.error}
          </div>
        )}

        {debugInfo?.success && (
          <>
            {/* Token Info */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Thông tin Token (JWT)
              </h2>
              {debugInfo.token && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">User ID:</span>
                    <span className="font-medium">{debugInfo.token.userId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{debugInfo.token.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role (raw):</span>
                    <span className="font-medium">{debugInfo.token.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role (normalized):</span>
                    <span
                      className={`font-bold ${
                        debugInfo.token.roleNormalized === 'admin'
                          ? 'text-[#ee4d2d]'
                          : 'text-gray-800'
                      }`}
                    >
                      {debugInfo.token.roleNormalized}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Database Info */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Thông tin Database
              </h2>
              {debugInfo.database && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">User ID:</span>
                    <span className="font-medium">{debugInfo.database.userId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{debugInfo.database.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tên:</span>
                    <span className="font-medium">{debugInfo.database.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role (raw):</span>
                    <span className="font-medium">{debugInfo.database.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role (normalized):</span>
                    <span
                      className={`font-bold ${
                        debugInfo.database.roleNormalized === 'admin'
                          ? 'text-[#ee4d2d]'
                          : 'text-gray-800'
                      }`}
                    >
                      {debugInfo.database.roleNormalized}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ngày tạo:</span>
                    <span className="font-medium">
                      {new Date(debugInfo.database.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cập nhật lần cuối:</span>
                    <span className="font-medium">
                      {new Date(debugInfo.database.updated_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Comparison */}
            {debugInfo.comparison && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  So sánh
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Role trong Token và Database khớp nhau?</span>
                    <span
                      className={`font-bold ${
                        debugInfo.comparison.rolesMatch ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {debugInfo.comparison.rolesMatch ? '✅ CÓ' : '❌ KHÔNG'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Token có role = 'admin'?</span>
                    <span
                      className={`font-bold ${
                        debugInfo.comparison.isAdminInToken ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {debugInfo.comparison.isAdminInToken ? '✅ CÓ' : '❌ KHÔNG'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Database có role = 'admin'?</span>
                    <span
                      className={`font-bold ${
                        debugInfo.comparison.isAdminInDatabase ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {debugInfo.comparison.isAdminInDatabase ? '✅ CÓ' : '❌ KHÔNG'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Nên được redirect đến trang admin?</span>
                    <span
                      className={`font-bold ${
                        debugInfo.comparison.shouldRedirectToAdmin ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {debugInfo.comparison.shouldRedirectToAdmin ? '✅ CÓ' : '❌ KHÔNG'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendation */}
            {debugInfo.recommendation && (
              <div
                className={`rounded-lg p-6 mb-6 ${
                  debugInfo.comparison?.rolesMatch
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}
              >
                <h3 className="text-lg font-bold mb-2">
                  {debugInfo.comparison?.rolesMatch ? '✅ Trạng thái' : '⚠️ Khuyến nghị'}
                </h3>
                <p
                  className={
                    debugInfo.comparison?.rolesMatch ? 'text-green-700' : 'text-yellow-700'
                  }
                >
                  {debugInfo.recommendation}
                </p>
                {!debugInfo.comparison?.rolesMatch && debugInfo.comparison?.isAdminInDatabase && (
                  <button
                    onClick={handleLogout}
                    className="mt-4 px-6 py-2 bg-[#ee4d2d] text-white rounded-lg font-medium hover:bg-[#f05d40] transition-colors"
                  >
                    Đăng xuất và đăng nhập lại
                  </button>
                )}
              </div>
            )}
          </>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-800 mb-3">💡 Giải thích</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-blue-700">
            <li>
              <strong>Token Role:</strong> Role được lưu trong JWT token khi đăng nhập
            </li>
            <li>
              <strong>Database Role:</strong> Role hiện tại trong database
            </li>
            <li>
              <strong>Vấn đề:</strong> Nếu database có role = 'admin' nhưng token vẫn có role cũ,
              bạn cần đăng xuất và đăng nhập lại để token mới được tạo
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

