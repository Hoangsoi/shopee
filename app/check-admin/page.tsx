'use client'

import { useState, useEffect } from 'react'

interface AdminUser {
  id: number
  email: string
  name: string
  phone?: string
  agent_code?: string
  role: string
  created_at: string
  updated_at?: string
}

interface AllUser {
  id: number
  email: string
  name: string
  role: string
  created_at: string
}

export default function CheckAdminPage() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [allUsers, setAllUsers] = useState<AllUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAdminUsers()
  }, [])

  const fetchAdminUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/check-admin')
      const data = await response.json()

      if (data.success) {
        setAdminUsers(data.adminUsers || [])
        setAllUsers(data.allUsers || [])
      } else {
        setError(data.error || 'Lỗi khi tải dữ liệu')
      }
    } catch (err) {
      setError('Lỗi kết nối đến server')
      console.error('Error:', err)
    } finally {
      setLoading(false)
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
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#ee4d2d] mb-6">
          Danh sách tài khoản Admin
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 py-3 px-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Thống kê */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tổng số tài khoản</p>
              <p className="text-2xl font-bold text-gray-800">{allUsers.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Số tài khoản Admin</p>
              <p className="text-2xl font-bold text-[#ee4d2d]">{adminUsers.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Số tài khoản User</p>
              <p className="text-2xl font-bold text-blue-600">
                {allUsers.length - adminUsers.length}
              </p>
            </div>
          </div>
        </div>

        {/* Danh sách Admin */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Tài khoản Admin ({adminUsers.length})
          </h2>
          {adminUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg mb-2">⚠️ Chưa có tài khoản admin nào</p>
              <p className="text-sm">
                Bạn cần set role = 'admin' cho ít nhất một tài khoản trong database
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tên</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Số điện thoại</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Mã đại lý</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">{user.id}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-800">{user.email}</td>
                      <td className="py-3 px-4 text-sm">{user.name || '-'}</td>
                      <td className="py-3 px-4 text-sm">{user.phone || '-'}</td>
                      <td className="py-3 px-4 text-sm">{user.agent_code || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block bg-[#ee4d2d] text-white text-xs font-bold px-2 py-1 rounded">
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(user.created_at).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Danh sách tất cả users */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Tất cả tài khoản ({allUsers.length})
          </h2>
          {allUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Chưa có tài khoản nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tên</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((user) => {
                    const isAdmin = user.role?.toLowerCase().trim() === 'admin'
                    return (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{user.id}</td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-800">{user.email}</td>
                        <td className="py-3 px-4 text-sm">{user.name || '-'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block text-xs font-bold px-2 py-1 rounded ${
                              isAdmin
                                ? 'bg-[#ee4d2d] text-white'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {user.role || 'user'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(user.created_at).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Hướng dẫn */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-blue-800 mb-3">💡 Hướng dẫn</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-blue-700">
            <li>
              <strong>Tài khoản Admin:</strong> Các tài khoản có role = 'admin' (đã được trim và lowercase)
            </li>
            <li>
              <strong>Để set role admin:</strong> Chạy SQL trong Neon Dashboard:
              <code className="block bg-white p-2 rounded mt-2 font-mono text-xs">
                UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
              </code>
            </li>
            <li>
              <strong>Sau khi set role:</strong> Đăng xuất và đăng nhập lại để token được tạo mới với role admin
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

