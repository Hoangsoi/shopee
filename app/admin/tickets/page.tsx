'use client'

import { useState, useEffect, useCallback } from 'react'

interface Ticket {
  id: number
  ticket_code: string
  draw_date: string
  created_at: string
  status: string
  user_id: number
  user_name?: string
  user_email?: string
}

interface User {
  id: number
  name: string
  email: string
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('')
  const [drawDate, setDrawDate] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterUserId, setFilterUserId] = useState<string>('')

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const response = await fetch('/api/admin/users?limit=1000')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        if (data.users && data.users.length === 0) {
          console.warn('No users found in database')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Lỗi không xác định' }))
        console.error('Error fetching users:', errorData)
        setMessage({ type: 'error', text: errorData.error || `Lỗi khi tải danh sách người dùng (${response.status})` })
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi tải danh sách người dùng' })
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const url = filterUserId
        ? `/api/admin/tickets?page=${page}&limit=50&user_id=${filterUserId}`
        : `/api/admin/tickets?page=${page}&limit=50`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
        setTotalPages(data.pagination?.totalPages || 1)
      } else {
        setMessage({ type: 'error', text: 'Lỗi khi tải danh sách vé' })
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi tải danh sách vé' })
    } finally {
      setLoading(false)
    }
  }, [page, filterUserId])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId || !drawDate) {
      setMessage({ type: 'error', text: 'Vui lòng chọn khách hàng và ngày mở thưởng' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: Number(selectedUserId),
          draw_date: new Date(drawDate).toISOString(),
          quantity,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Tạo vé thành công!' })
        setShowCreateModal(false)
        setSelectedUserId('')
        setDrawDate('')
        setQuantity(1)
        fetchTickets()
      } else {
        setMessage({ type: 'error', text: data.error || 'Tạo vé thất bại' })
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi tạo vé' })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎫</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Quản lý Vé dự thưởng</h1>
                <p className="text-sm text-gray-500 mt-1">Tạo và quản lý vé dự thưởng cho khách hàng</p>
              </div>
            </div>
            <button
              onClick={() => {
                // Đảm bảo users được load trước khi mở modal
                if (users.length === 0 && !loadingUsers) {
                  fetchUsers()
                }
                setShowCreateModal(true)
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              + Tạo vé mới
            </button>
          </div>

          {message && (
            <div
              className={`py-3 px-4 rounded-lg mb-4 ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-600'
                  : 'bg-red-50 border border-red-200 text-red-600'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Filter */}
          <div className="mb-4 flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lọc theo khách hàng
              </label>
              <select
                value={filterUserId}
                onChange={(e) => {
                  setFilterUserId(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-600"
              >
                <option value="">Tất cả khách hàng</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🎫</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Chưa có vé nào</h2>
              <p className="text-gray-500 mb-4">Hãy tạo vé đầu tiên cho khách hàng</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                + Tạo vé mới
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-3 border-b text-left text-xs font-semibold text-gray-700">ID</th>
                      <th className="py-2 px-3 border-b text-left text-xs font-semibold text-gray-700">Mã vé</th>
                      <th className="py-2 px-3 border-b text-left text-xs font-semibold text-gray-700">Khách hàng</th>
                      <th className="py-2 px-3 border-b text-left text-xs font-semibold text-gray-700">Ngày mở thưởng</th>
                      <th className="py-2 px-3 border-b text-left text-xs font-semibold text-gray-700">Ngày tạo</th>
                      <th className="py-2 px-3 border-b text-left text-xs font-semibold text-gray-700">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => {
                      const drawDate = new Date(ticket.draw_date)
                      const isExpired = drawDate.getTime() <= new Date().getTime()

                      return (
                        <tr key={ticket.id} className="hover:bg-gray-50">
                          <td className="py-2 px-3 border-b text-xs text-gray-800">{ticket.id}</td>
                          <td className="py-2 px-3 border-b text-xs">
                            <span className="font-mono font-bold text-orange-600">{ticket.ticket_code}</span>
                          </td>
                          <td className="py-2 px-3 border-b text-xs text-gray-800">
                            <div>
                              <div className="font-medium">{ticket.user_name || 'N/A'}</div>
                              <div className="text-gray-500 text-[10px]">{ticket.user_email || 'N/A'}</div>
                            </div>
                          </td>
                          <td className="py-2 px-3 border-b text-xs text-gray-800">
                            {formatDate(ticket.draw_date)}
                          </td>
                          <td className="py-2 px-3 border-b text-xs text-gray-600">
                            {formatDate(ticket.created_at)}
                          </td>
                          <td className="py-2 px-3 border-b text-xs">
                            {isExpired ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">
                                Đã mở
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-medium">
                                Chờ mở
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Trước
                  </button>
                  <span className="text-sm text-gray-600">
                    Trang {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Sau
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Tạo vé dự thưởng</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setSelectedUserId('')
                    setDrawDate('')
                    setQuantity(1)
                    setMessage(null)
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Khách hàng <span className="text-red-500">*</span>
                  </label>
                  {loadingUsers ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Đang tải danh sách...</span>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="w-full px-3 py-2 border border-red-300 rounded-lg bg-red-50">
                      <p className="text-sm text-red-600">Không có người dùng nào. Vui lòng thử lại.</p>
                      <button
                        type="button"
                        onClick={fetchUsers}
                        className="mt-2 text-sm text-orange-600 hover:text-orange-700 underline"
                      >
                        Tải lại danh sách
                      </button>
                    </div>
                  ) : (
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value as number | '')}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-600"
                    >
                      <option value="">Chọn khách hàng</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày mở thưởng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={drawDate}
                    onChange={(e) => setDrawDate(e.target.value)}
                    required
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lượng vé <span className="text-gray-500">(Tối đa 100)</span>
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-600"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setSelectedUserId('')
                      setDrawDate('')
                      setQuantity(1)
                      setMessage(null)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Đang tạo...' : 'Tạo vé'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

