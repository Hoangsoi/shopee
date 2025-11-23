'use client'

import { useState, useEffect, useCallback } from 'react'

interface User {
  id: number
  email: string
  name: string
  phone?: string
  agent_code?: string
  role: string
  wallet_balance: number
  commission: number
  created_at: string
  is_frozen?: boolean
  vip_level?: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<User & { is_frozen: boolean }>>({})
  const [showEditModal, setShowEditModal] = useState(false)
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [balanceFormData, setBalanceFormData] = useState({
    amount: '',
    type: 'add' as 'add' | 'subtract',
    description: '',
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchUsers = useCallback(async (search?: string) => {
    setLoading(true)
    try {
      const url = search ? `/api/admin/users?search=${encodeURIComponent(search)}` : '/api/admin/users'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      } else {
        setMessage({ type: 'error', text: 'Lỗi khi tải danh sách người dùng' })
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi tải danh sách người dùng' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    // Đánh dấu admin đã xem trang này để reset bộ đếm
    fetch('/api/admin/users/mark-viewed', { method: 'POST' }).catch(() => {
      // Ignore errors (silent fail)
    })
  }, [fetchUsers])

  useEffect(() => {
    if (searchTerm) {
      const timeoutId = setTimeout(() => {
        fetchUsers(searchTerm)
      }, 500)
      return () => clearTimeout(timeoutId)
    } else {
      fetchUsers()
    }
  }, [searchTerm, fetchUsers])

  const handleEdit = (user: User) => {
    setEditingId(user.id)
    setEditFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      agent_code: user.agent_code || '',
      role: user.role,
      wallet_balance: user.wallet_balance,
      commission: user.commission,
      is_frozen: user.is_frozen || false,
    })
    setShowEditModal(true)
    setMessage(null)
  }

  const handleAdjustBalance = (user: User) => {
    setEditingId(user.id)
    setBalanceFormData({
      amount: '',
      type: 'add',
      description: '',
    })
    setShowBalanceModal(true)
    setMessage(null)
  }

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setBalanceFormData((prev) => ({
      ...prev,
      [name]: name === 'amount' ? value : value,
    }))
  }

  const handleBalanceSave = async () => {
    if (!editingId || !balanceFormData.amount) {
      setMessage({ type: 'error', text: 'Vui lòng nhập số tiền' })
      return
    }

    const amount = parseFloat(balanceFormData.amount)
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Số tiền không hợp lệ' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/adjust-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: editingId,
          amount: amount,
          type: balanceFormData.type,
          description: balanceFormData.description || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Cập nhật thành công!' })
        setShowBalanceModal(false)
        setBalanceFormData({ amount: '', type: 'add', description: '' })
        setEditingId(null)
        fetchUsers(searchTerm)
      } else {
        setMessage({ type: 'error', text: data.error || 'Cập nhật thất bại' })
      }
    } catch (error) {
      console.error('Error adjusting balance:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi cập nhật.' })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'wallet_balance' || name === 'commission' ? parseFloat(value) || 0 : value),
    }))
  }

  const handleSave = async () => {
    if (!editingId) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: editingId,
          ...editFormData,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Cập nhật thành công!' })
        setEditingId(null)
        setEditFormData({})
        setShowEditModal(false)
        fetchUsers(searchTerm)
      } else {
        setMessage({ type: 'error', text: data.error || 'Cập nhật thất bại' })
      }
    } catch (error) {
      console.error('Error saving user:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi cập nhật.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId: number) => {
    if (!confirm('Bạn có chắc muốn xóa người dùng này? Hành động này không thể hoàn tác.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Xóa người dùng thành công!' })
        fetchUsers(searchTerm)
      } else {
        setMessage({ type: 'error', text: data.error || 'Xóa thất bại' })
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi xóa.' })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-[#ee4d2d]">Quản lý người dùng</h1>
          </div>

          {/* Search */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email, số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
              style={{ fontSize: '16px' }}
            />
          </div>

          {message && (
            <div
              className={`py-2 px-3 rounded-sm mb-3 text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-600'
                  : 'bg-red-50 border border-red-200 text-red-600'
              }`}
            >
              {message.text}
            </div>
          )}

          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              {searchTerm ? 'Không tìm thấy người dùng nào.' : 'Chưa có người dùng nào.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-1 px-2 border-b text-left text-xs font-semibold text-gray-700">ID</th>
                    <th className="py-1 px-2 border-b text-left text-xs font-semibold text-gray-700">Tên</th>
                    <th className="py-1 px-2 border-b text-left text-xs font-semibold text-gray-700">Email</th>
                    <th className="py-1 px-2 border-b text-left text-xs font-semibold text-gray-700">SĐT</th>
                    <th className="py-1 px-2 border-b text-left text-xs font-semibold text-gray-700">Vai trò</th>
                    <th className="py-1 px-2 border-b text-left text-xs font-semibold text-gray-700">VIP</th>
                    <th className="py-1 px-2 border-b text-left text-xs font-semibold text-gray-700">Trạng thái</th>
                    <th className="py-1 px-2 border-b text-left text-xs font-semibold text-gray-700">Số dư ví</th>
                    <th className="py-1 px-2 border-b text-left text-xs font-semibold text-gray-700">Hoa hồng</th>
                    <th className="py-1 px-2 border-b text-left text-xs font-semibold text-gray-700">Ngày tạo</th>
                    <th className="py-1 px-2 border-b text-left text-xs font-semibold text-gray-700">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 border-b text-xs text-gray-800 font-medium">{user.id}</td>
                      <td className="py-2 px-3 border-b text-xs text-gray-800 max-w-[120px] truncate" title={user.name}>{user.name}</td>
                      <td className="py-2 px-3 border-b text-xs text-gray-800 max-w-[150px] truncate" title={user.email}>{user.email}</td>
                      <td className="py-2 px-3 border-b text-xs text-gray-600 whitespace-nowrap">{user.phone || '-'}</td>
                      <td className="py-2 px-3 border-b text-xs">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role === 'admin' ? 'A' : 'U'}
                        </span>
                      </td>
                      <td className="py-2 px-3 border-b text-xs text-center">
                        {user.vip_level && user.vip_level > 0 ? (
                          <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800" title={`VIP ${user.vip_level}`}>
                            ⭐ {user.vip_level}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 border-b text-xs">
                        {user.is_frozen ? (
                          <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-red-100 text-red-800" title="Đóng băng">
                            🔒 Đóng băng
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-green-100 text-green-800" title="Hoạt động">
                            ✓ Hoạt động
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 border-b text-xs text-gray-800 font-medium whitespace-nowrap">
                        {formatCurrency(user.wallet_balance || 0)}
                      </td>
                      <td className="py-2 px-3 border-b text-xs text-gray-800 font-medium whitespace-nowrap">
                        {formatCurrency(user.commission || 0)}
                      </td>
                      <td className="py-2 px-3 border-b text-xs text-gray-600 whitespace-nowrap">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN', { 
                          day: '2-digit', 
                          month: '2-digit',
                          year: 'numeric'
                        }) : '-'}
                      </td>
                      <td className="py-1 px-2 border-b text-xs">
                        <div className="flex gap-1 flex-wrap">
                          <button
                            onClick={() => handleEdit(user)}
                            className="px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-[10px]"
                            title="Sửa"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Bạn có chắc muốn ${user.is_frozen ? 'mở băng' : 'đóng băng'} tài khoản này?`)) {
                                return
                              }
                              setLoading(true)
                              try {
                                const response = await fetch('/api/admin/users', {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    user_id: user.id,
                                    is_frozen: !user.is_frozen,
                                  }),
                                })
                                const data = await response.json()
                                if (response.ok) {
                                  setMessage({ type: 'success', text: data.message || 'Cập nhật thành công!' })
                                  fetchUsers(searchTerm)
                                } else {
                                  setMessage({ type: 'error', text: data.error || 'Cập nhật thất bại' })
                                }
                              } catch (error) {
                                console.error('Error toggling freeze:', error)
                                setMessage({ type: 'error', text: 'Lỗi kết nối khi cập nhật.' })
                              } finally {
                                setLoading(false)
                              }
                            }}
                            className={`px-2 py-0.5 text-white rounded hover:opacity-80 transition-colors text-[10px] ${
                              user.is_frozen 
                                ? 'bg-green-500' 
                                : 'bg-red-500'
                            }`}
                            title={user.is_frozen ? 'Mở băng' : 'Đóng băng'}
                          >
                            {user.is_frozen ? '🔓' : '🔒'}
                          </button>
                          <button
                            onClick={() => handleAdjustBalance(user)}
                            className="px-2 py-0.5 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-[10px]"
                            title="Cộng/Trừ tiền"
                          >
                            💰
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="px-2 py-0.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-[10px]"
                            title="Xóa"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Edit Modal */}
          {showEditModal && editingId && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[#ee4d2d]">Sửa thông tin người dùng</h2>
                    <button
                      onClick={() => {
                        setShowEditModal(false)
                        setEditingId(null)
                        setEditFormData({})
                        setMessage(null)
                      }}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ×
                    </button>
                  </div>

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

                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSave()
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ID <span className="text-gray-500">(Không thể thay đổi)</span>
                        </label>
                        <input
                          type="text"
                          value={editingId}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ngày tạo <span className="text-gray-500">(Chỉ xem)</span>
                        </label>
                        <input
                          type="text"
                          value={
                            users.find((u) => u.id === editingId)?.created_at
                              ? new Date(users.find((u) => u.id === editingId)!.created_at).toLocaleString('vi-VN')
                              : 'N/A'
                          }
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tên <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={editFormData.name || ''}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                          style={{ fontSize: '16px' }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={editFormData.email || ''}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                          style={{ fontSize: '16px' }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                        <input
                          type="text"
                          name="phone"
                          value={editFormData.phone || ''}
                          onChange={handleChange}
                          placeholder="Nhập số điện thoại"
                          className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                          style={{ fontSize: '16px' }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mã đại lý</label>
                        <input
                          type="text"
                          name="agent_code"
                          value={editFormData.agent_code || ''}
                          onChange={handleChange}
                          placeholder="Nhập mã đại lý"
                          className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                          style={{ fontSize: '16px' }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Vai trò <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="role"
                          value={editFormData.role || 'user'}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d]"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số dư ví (₫)</label>
                        <input
                          type="number"
                          name="wallet_balance"
                          value={editFormData.wallet_balance || 0}
                          onChange={handleChange}
                          min="0"
                          step="1000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                          style={{ fontSize: '16px' }}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Hiện tại: {formatCurrency(users.find((u) => u.id === editingId)?.wallet_balance || 0)}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hoa hồng (₫)</label>
                        <input
                          type="number"
                          name="commission"
                          value={editFormData.commission || 0}
                          onChange={handleChange}
                          min="0"
                          step="1000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                          style={{ fontSize: '16px' }}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Hiện tại: {formatCurrency(users.find((u) => u.id === editingId)?.commission || 0)}
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Trạng thái tài khoản
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editFormData.is_frozen || false}
                            onChange={(e) => {
                              setEditFormData((prev) => ({
                                ...prev,
                                is_frozen: e.target.checked,
                              }))
                            }}
                            className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          <span className="text-sm text-gray-700">
                            {editFormData.is_frozen ? (
                              <span className="text-red-600 font-semibold">🔒 Đóng băng tài khoản</span>
                            ) : (
                              <span className="text-green-600">✓ Tài khoản hoạt động</span>
                            )}
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1 ml-7">
                          Khi đóng băng: Khách hàng vẫn đăng nhập được nhưng không thể mua hàng và rút tiền
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditModal(false)
                          setEditingId(null)
                          setEditFormData({})
                          setMessage(null)
                        }}
                        disabled={loading}
                        className="px-4 py-2 bg-gray-500 text-white rounded-sm hover:bg-gray-600 transition-colors disabled:opacity-50"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-[#ee4d2d] text-white rounded-sm hover:bg-[#f05d40] transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Balance Adjustment Modal */}
          {showBalanceModal && editingId && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[#ee4d2d]">Cộng/Trừ tiền</h2>
                    <button
                      onClick={() => {
                        setShowBalanceModal(false)
                        setEditingId(null)
                        setBalanceFormData({ amount: '', type: 'add', description: '' })
                        setMessage(null)
                      }}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ×
                    </button>
                  </div>

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

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Người dùng
                    </label>
                    <input
                      type="text"
                      value={users.find((u) => u.id === editingId)?.name || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loại giao dịch <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="type"
                      value={balanceFormData.type}
                      onChange={handleBalanceChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d]"
                    >
                      <option value="add">Cộng tiền (Nạp tiền)</option>
                      <option value="subtract">Trừ tiền</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {balanceFormData.type === 'add' 
                        ? 'Cộng tiền sẽ ghi lịch sử giao dịch'
                        : 'Trừ tiền sẽ KHÔNG ghi lịch sử và KHÔNG hiển thị thông báo cho khách'}
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Số tiền (₫) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={balanceFormData.amount}
                      onChange={handleBalanceChange}
                      required
                      min="1"
                      step="1000"
                      placeholder="Nhập số tiền"
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                      style={{ fontSize: '16px' }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Số dư hiện tại: {formatCurrency(users.find((u) => u.id === editingId)?.wallet_balance || 0)}
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ghi chú (tùy chọn)
                    </label>
                    <textarea
                      name="description"
                      value={balanceFormData.description}
                      onChange={handleBalanceChange}
                      rows={3}
                      placeholder="Nhập ghi chú (nếu có)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                      style={{ fontSize: '16px' }}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBalanceModal(false)
                        setEditingId(null)
                        setBalanceFormData({ amount: '', type: 'add', description: '' })
                        setMessage(null)
                      }}
                      disabled={loading}
                      className="px-4 py-2 bg-gray-500 text-white rounded-sm hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleBalanceSave}
                      disabled={loading}
                      className={`px-4 py-2 text-white rounded-sm transition-colors disabled:opacity-50 ${
                        balanceFormData.type === 'add'
                          ? 'bg-green-500 hover:bg-green-600'
                          : 'bg-orange-500 hover:bg-orange-600'
                      }`}
                    >
                      {loading ? 'Đang xử lý...' : balanceFormData.type === 'add' ? 'Cộng tiền' : 'Trừ tiền'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

