'use client'

import { useState, useEffect } from 'react'

interface Notification {
  id: number
  content: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<Notification>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormData, setAddFormData] = useState({
    content: '',
    is_active: true,
    sort_order: 0,
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      } else {
        setMessage({ type: 'error', text: 'Lỗi khi tải danh sách thông báo' })
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi tải danh sách thông báo' })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addFormData),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Thêm thông báo thành công!' })
        setShowAddForm(false)
        setAddFormData({ content: '', is_active: true, sort_order: 0 })
        fetchNotifications()
      } else {
        setMessage({ type: 'error', text: data.error || 'Thêm thông báo thất bại' })
      }
    } catch (error) {
      console.error('Error adding notification:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi thêm thông báo.' })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (notification: Notification) => {
    setEditingId(notification.id)
    setEditFormData({
      content: notification.content,
      is_active: notification.is_active,
      sort_order: notification.sort_order,
    })
    setMessage(null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value,
    }))
  }

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setAddFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value,
    }))
  }

  const handleSave = async () => {
    if (!editingId) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notification_id: editingId,
          ...editFormData,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Cập nhật thành công!' })
        setEditingId(null)
        setEditFormData({})
        fetchNotifications()
      } else {
        setMessage({ type: 'error', text: data.error || 'Cập nhật thất bại' })
      }
    } catch (error) {
      console.error('Error saving notification:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi cập nhật.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (notificationId: number) => {
    if (!confirm('Bạn có chắc muốn xóa thông báo này?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/notifications?id=${notificationId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Xóa thông báo thành công!' })
        fetchNotifications()
      } else {
        setMessage({ type: 'error', text: data.error || 'Xóa thất bại' })
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi xóa.' })
    } finally {
      setLoading(false)
    }
  }

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-[#ee4d2d]">Quản lý thông báo</h1>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-[#ee4d2d] text-white rounded-sm hover:bg-[#f05d40] transition-colors text-sm"
            >
              {showAddForm ? 'Hủy' : '+ Thêm thông báo'}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAdd} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-4">Thêm thông báo mới</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Nội dung *</label>
                  <textarea
                    name="content"
                    required
                    value={addFormData.content}
                    onChange={handleAddChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                    style={{ fontSize: '16px' }}
                    placeholder="Nhập nội dung thông báo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Thứ tự sắp xếp</label>
                    <input
                      type="number"
                      name="sort_order"
                      value={addFormData.sort_order}
                      onChange={handleAddChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={addFormData.is_active}
                        onChange={handleAddChange}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Kích hoạt</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 text-white rounded-sm hover:bg-green-600 transition-colors text-sm disabled:opacity-50"
                >
                  {loading ? 'Đang thêm...' : 'Thêm thông báo'}
                </button>
              </div>
            </form>
          )}

          {message && (
            <div
              className={`py-3 px-4 rounded-sm mb-4 ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-600'
                  : 'bg-red-50 border border-red-200 text-red-600'
              }`}
            >
              {message.text}
            </div>
          )}

          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              Chưa có thông báo nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">ID</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Nội dung</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Thứ tự</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Trạng thái</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((notification) => (
                    <tr key={notification.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b text-sm text-gray-800">{notification.id}</td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {editingId === notification.id ? (
                          <textarea
                            name="content"
                            value={editFormData.content || ''}
                            onChange={handleChange}
                            rows={2}
                            className="w-full px-2 py-1 border rounded-sm text-sm text-gray-900"
                            style={{ fontSize: '16px' }}
                          />
                        ) : (
                          <div className="max-w-md">{notification.content}</div>
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {editingId === notification.id ? (
                          <input
                            type="number"
                            name="sort_order"
                            value={editFormData.sort_order || 0}
                            onChange={handleChange}
                            className="w-full px-2 py-1 border rounded-sm text-sm text-gray-900"
                            style={{ fontSize: '16px' }}
                          />
                        ) : (
                          notification.sort_order
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm">
                        {editingId === notification.id ? (
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              name="is_active"
                              checked={editFormData.is_active !== false}
                              onChange={handleChange}
                              className="rounded"
                            />
                            <span className="text-xs">Kích hoạt</span>
                          </label>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            notification.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {notification.is_active ? 'Hoạt động' : 'Tắt'}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm">
                        {editingId === notification.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={handleSave}
                              disabled={loading}
                              className="px-3 py-1 bg-green-500 text-white rounded-sm hover:bg-green-600 transition-colors text-xs disabled:opacity-50"
                            >
                              {loading ? 'Đang lưu...' : 'Lưu'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null)
                                setEditFormData({})
                                setMessage(null)
                              }}
                              disabled={loading}
                              className="px-3 py-1 bg-gray-500 text-white rounded-sm hover:bg-gray-600 transition-colors text-xs disabled:opacity-50"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(notification)}
                              className="px-3 py-1 bg-blue-500 text-white rounded-sm hover:bg-blue-600 transition-colors text-xs"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDelete(notification.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded-sm hover:bg-red-600 transition-colors text-xs"
                            >
                              Xóa
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

