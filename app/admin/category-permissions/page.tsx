'use client'

import { useState, useEffect, useCallback } from 'react'

interface User {
  id: number
  email: string
  name: string
  phone?: string
}

interface Category {
  category_id: number
  category_name: string
  category_slug: string
  discount_percent: number
  has_permission: boolean
  granted_at?: string
}

export default function CategoryPermissionsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUserPermissions = useCallback(async (userId: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/user-category-permissions?user_id=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      } else {
        setMessage({ type: 'error', text: 'Không thể tải quyền truy cập' })
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
      setMessage({ type: 'error', text: 'Lỗi khi tải quyền truy cập' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    if (selectedUserId) {
      fetchUserPermissions(selectedUserId)
    } else {
      setCategories([])
    }
  }, [selectedUserId, fetchUserPermissions])

  const handlePermissionToggle = async (categoryId: number, hasPermission: boolean) => {
    if (!selectedUserId) return

    setSaving(true)
    setMessage(null)

    try {
      if (hasPermission) {
        // Thu hồi quyền
        const response = await fetch(
          `/api/admin/user-category-permissions?user_id=${selectedUserId}&category_id=${categoryId}`,
          { method: 'DELETE' }
        )
        if (response.ok) {
          setMessage({ type: 'success', text: 'Đã thu hồi quyền thành công' })
          // Cập nhật lại danh sách
          fetchUserPermissions(selectedUserId)
        } else {
          const data = await response.json()
          setMessage({ type: 'error', text: data.error || 'Không thể thu hồi quyền' })
        }
      } else {
        // Cấp quyền
        const response = await fetch('/api/admin/user-category-permissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: selectedUserId,
            category_id: categoryId,
          }),
        })
        if (response.ok) {
          setMessage({ type: 'success', text: 'Đã cấp quyền thành công' })
          // Cập nhật lại danh sách
          fetchUserPermissions(selectedUserId)
        } else {
          const data = await response.json()
          setMessage({ type: 'error', text: data.error || 'Không thể cấp quyền' })
        }
      }
    } catch (error) {
      console.error('Error updating permission:', error)
      setMessage({ type: 'error', text: 'Lỗi khi cập nhật quyền' })
    } finally {
      setSaving(false)
    }
  }

  const categoryIcons: { [key: string]: string } = {
    'Mỹ phẩm': '💄',
    'Điện tử': '📱',
    'Điện lạnh': '❄️',
    'Cao cấp': '💎',
    'VIP': '⭐',
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Quản lý phân quyền khu vực</h1>
        <p className="text-sm text-gray-600">Cấp hoặc thu hồi quyền truy cập các khu vực mua hàng cho người dùng</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-3 p-2 rounded text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-2">
            <h2 className="text-sm font-semibold text-gray-800 mb-2 px-2">Danh sách người dùng ({users.length})</h2>
            {loading && !selectedUserId ? (
              <div className="text-center py-4 text-gray-500 text-sm">Đang tải...</div>
            ) : (
              <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full text-left p-2 rounded transition-colors text-xs ${
                      selectedUserId === user.id
                        ? 'bg-[#ee4d2d] text-white'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="font-medium truncate">{user.name || user.email}</div>
                    <div className={`truncate ${selectedUserId === user.id ? 'text-white/80' : 'text-gray-500'}`}>
                      {user.email}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Permissions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-4">
            {!selectedUserId ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <div className="text-3xl mb-2">👆</div>
                <p>Vui lòng chọn một người dùng để xem và quản lý quyền truy cập</p>
              </div>
            ) : loading ? (
              <div className="text-center py-8 text-gray-500 text-sm">Đang tải quyền truy cập...</div>
            ) : (
              <>
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-gray-800 mb-1">
                    Quyền truy cập khu vực
                  </h2>
                  <p className="text-xs text-gray-600">
                    {users.find(u => u.id === selectedUserId)?.name || users.find(u => u.id === selectedUserId)?.email}
                  </p>
                </div>

                <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                  {categories.map((category) => (
                    <div
                      key={category.category_id}
                      className={`flex items-center justify-between p-2 rounded border transition-all ${
                        category.has_permission
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="text-xl flex-shrink-0">
                          {categoryIcons[category.category_name] || '📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 text-sm truncate">
                            {category.category_name}
                          </div>
                          <div className="text-xs text-gray-600">
                            Giảm {category.discount_percent}%
                            {category.has_permission && category.granted_at && (
                              <span className="ml-1 text-gray-500">
                                • {new Date(category.granted_at).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {category.has_permission ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                            ✓
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs font-medium">
                            🔒
                          </span>
                        )}
                        <button
                          onClick={() => handlePermissionToggle(category.category_id, category.has_permission)}
                          disabled={saving}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                            category.has_permission
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-[#ee4d2d] text-white hover:bg-[#f05d40]'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {saving ? '...' : category.has_permission ? 'Thu hồi' : 'Cấp'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {categories.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    <div className="text-3xl mb-2">📁</div>
                    <p>Chưa có danh mục nào</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

