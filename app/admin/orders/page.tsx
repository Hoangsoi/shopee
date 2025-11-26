'use client'

import { useState, useEffect, useCallback } from 'react'

interface Order {
  id: number
  order_number: string
  user_id: number
  user_name: string
  user_email: string
  total_amount: number
  status: string
  payment_method?: string
  item_count: number
  created_at: string
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingOrderId, setRejectingOrderId] = useState<number | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string>('Hết hàng')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const url = filterStatus 
        ? `/api/admin/orders?status=${filterStatus}`
        : '/api/admin/orders'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
      } else {
        setMessage({ type: 'error', text: 'Lỗi khi tải danh sách đơn hàng' })
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi tải danh sách đơn hàng' })
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleApprove = async (orderId: number) => {
    if (!confirm('Xác nhận phê duyệt đơn hàng này? Khách hàng sẽ nhận lại tiền gốc và hoa hồng.')) {
      return
    }

    setProcessingId(orderId)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          status: 'confirmed',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Phê duyệt đơn hàng thành công!' })
        fetchOrders()
      } else {
        setMessage({ type: 'error', text: data.error || 'Phê duyệt đơn hàng thất bại' })
      }
    } catch (error) {
      console.error('Error approving order:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi phê duyệt đơn hàng' })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = (orderId: number) => {
    setRejectingOrderId(orderId)
    setRejectionReason('Hết hàng') // Reset về lý do mặc định
    setShowRejectModal(true)
  }

  const confirmReject = async () => {
    if (!rejectingOrderId) return

    setProcessingId(rejectingOrderId)
    setMessage(null)
    setShowRejectModal(false)

    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: rejectingOrderId,
          status: 'cancelled',
          rejection_reason: rejectionReason || 'Hết hàng',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Từ chối đơn hàng thành công!' })
        fetchOrders()
      } else {
        setMessage({ type: 'error', text: data.error || 'Từ chối đơn hàng thất bại' })
      }
    } catch (error) {
      console.error('Error rejecting order:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi từ chối đơn hàng' })
    } finally {
      setProcessingId(null)
      setRejectingOrderId(null)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  const getStatusLabel = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      pending: 'Chờ phê duyệt',
      confirmed: 'Đã phê duyệt',
      shipping: 'Đang giao hàng',
      delivered: 'Đã giao hàng',
      cancelled: 'Đã hủy',
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string): string => {
    const colorMap: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      shipping: 'bg-blue-100 text-blue-800',
      delivered: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
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
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#ee4d2d]">Quản lý đơn hàng</h1>
          </div>

          {/* Filter */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setFilterStatus('')}
              className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                filterStatus === ''
                  ? 'bg-[#ee4d2d] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                filterStatus === 'pending'
                  ? 'bg-[#ee4d2d] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Chờ phê duyệt
            </button>
            <button
              onClick={() => setFilterStatus('confirmed')}
              className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                filterStatus === 'confirmed'
                  ? 'bg-[#ee4d2d] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Đã phê duyệt
            </button>
            <button
              onClick={() => setFilterStatus('cancelled')}
              className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                filterStatus === 'cancelled'
                  ? 'bg-[#ee4d2d] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Đã hủy
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

          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              Chưa có đơn hàng nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Mã đơn</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Khách hàng</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Tổng tiền</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Số SP</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Trạng thái</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Ngày đặt</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b text-sm text-gray-800 font-medium">
                        {order.order_number}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        <p className="font-medium">{order.user_name}</p>
                        <p className="text-xs text-gray-500">{order.user_email}</p>
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800 font-bold text-[#ee4d2d]">
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {order.item_count}
                      </td>
                      <td className="py-2 px-4 border-b text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2 px-4 border-b text-sm">
                        {order.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(order.id)}
                              disabled={processingId === order.id}
                              className="px-3 py-1 bg-green-500 text-white rounded-sm hover:bg-green-600 transition-colors text-xs disabled:opacity-50"
                            >
                              {processingId === order.id ? 'Đang xử lý...' : 'Phê duyệt'}
                            </button>
                            <button
                              onClick={() => handleReject(order.id)}
                              disabled={processingId === order.id}
                              className="px-3 py-1 bg-red-500 text-white rounded-sm hover:bg-red-600 transition-colors text-xs disabled:opacity-50"
                            >
                              Từ chối
                            </button>
                          </div>
                        )}
                        {order.status !== 'pending' && (
                          <span className="text-gray-400 text-xs">Đã xử lý</span>
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

      {/* Modal từ chối đơn hàng */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Từ chối đơn hàng</h2>
              <p className="text-sm text-gray-600 mb-4">
                Khách hàng sẽ chỉ nhận lại tiền gốc, không có hoa hồng.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do từ chối:
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d]"
                  placeholder="Nhập lý do từ chối"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setRejectingOrderId(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-sm hover:bg-gray-300 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmReject}
                  className="px-4 py-2 bg-red-500 text-white rounded-sm hover:bg-red-600 transition-colors"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

