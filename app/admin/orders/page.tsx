'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import ProductThumb from '@/components/ProductThumb'

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

interface AdminUserOption {
  id: number
  name: string | null
  email: string
  phone?: string | null
  wallet_balance: number
}

interface ProductPick {
  id: number
  name: string
  price: number
  stock: number
  image_url?: string | null
  /** Chênh lệch so với giá trị đơn hàng admin nhập (VNĐ) */
  price_distance?: number
}

function parseOrderValueVnd(raw: string): number | null {
  const s = raw.replace(/\s/g, '')
  if (!s) return null
  const onlyDigits = s.replace(/\./g, '').replace(/,/g, '')
  if (!/^\d+$/.test(onlyDigits)) return null
  const n = parseInt(onlyDigits, 10)
  if (!Number.isFinite(n) || n < 1) return null
  return n
}

interface OrderLine {
  product_id: number
  name: string
  price: number
  stock: number
  quantity: number
  image_url?: string | null
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

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [adminUsers, setAdminUsers] = useState<AdminUserOption[]>([])
  const [usersListLoading, setUsersListLoading] = useState(false)
  const [usersLoadError, setUsersLoadError] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('')
  const [orderLines, setOrderLines] = useState<OrderLine[]>([])
  /** Giá trị đơn hàng mục tiêu (VNĐ) — dùng gợi ý SP theo giá; tên state giữ `productSearch` cho tương thích bundle/HMR */
  const [productSearch, setProductSearch] = useState('')
  const [productHits, setProductHits] = useState<ProductPick[]>([])
  const [productSuggestLoading, setProductSuggestLoading] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    let list = adminUsers
    if (q) {
      list = adminUsers.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.name && u.name.toLowerCase().includes(q)) ||
          String(u.id) === q ||
          String(u.id).includes(q) ||
          (u.phone && String(u.phone).replace(/\s/g, '').includes(q.replace(/\s/g, '')))
      )
    }
    return list.slice(0, 100)
  }, [adminUsers, customerSearch])

  const selectedUser = useMemo(
    () => adminUsers.find((u) => u.id === selectedUserId) ?? null,
    [adminUsers, selectedUserId]
  )

  const linesTotal = useMemo(
    () => orderLines.reduce((sum, l) => sum + l.price * l.quantity, 0),
    [orderLines]
  )

  const openCreateModal = useCallback(async () => {
    setShowCreateModal(true)
    setUsersLoadError(null)
    setSelectedUserId('')
    setCustomerSearch('')
    setOrderLines([])
    setProductSearch('')
    setProductHits([])
    setUsersListLoading(true)
    try {
      const res = await fetch('/api/admin/users?limit=500&page=1')
      const data = await res.json()
      if (!res.ok) {
        setUsersLoadError(data.error || 'Không tải được danh sách khách hàng')
        setAdminUsers([])
        return
      }
      setAdminUsers(
        (data.users || []).map((u: AdminUserOption & { phone?: string | null }) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone ?? null,
          wallet_balance: typeof u.wallet_balance === 'number' ? u.wallet_balance : 0,
        }))
      )
    } catch {
      setUsersLoadError('Lỗi kết nối khi tải khách hàng')
      setAdminUsers([])
    } finally {
      setUsersListLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!showCreateModal) {
      setProductHits([])
      return
    }
    const target = parseOrderValueVnd(productSearch)
    if (target === null) {
      setProductHits([])
      return
    }
    const t = setTimeout(async () => {
      setProductSuggestLoading(true)
      try {
        const res = await fetch(
          `/api/admin/products?near_price=${target}&limit=30&is_active=true&page=1`
        )
        const data = await res.json()
        if (res.ok && data.products) {
          setProductHits(
            data.products.map(
              (p: {
                id: number
                name: string
                price: number
                stock: number
                image_url?: string | null
                price_distance?: number
              }) => ({
                id: p.id,
                name: p.name,
                price: p.price,
                stock: p.stock ?? 0,
                image_url: p.image_url ?? null,
                price_distance:
                  typeof p.price_distance === 'number' && Number.isFinite(p.price_distance)
                    ? p.price_distance
                    : undefined,
              })
            )
          )
        } else {
          setProductHits([])
        }
      } catch {
        setProductHits([])
      } finally {
        setProductSuggestLoading(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [productSearch, showCreateModal])

  const addProductLine = (p: ProductPick) => {
    setOrderLines((prev) => {
      const idx = prev.findIndex((l) => l.product_id === p.id)
      if (idx >= 0) {
        const next = [...prev]
        const merged = next[idx]
        const newQty = merged.quantity + 1
        if (newQty > merged.stock) {
          setMessage({ type: 'error', text: `Tồn kho "${p.name}" chỉ còn ${merged.stock}` })
          return prev
        }
        next[idx] = { ...merged, quantity: newQty }
        return next
      }
      if (p.stock < 1) {
        setMessage({ type: 'error', text: `Sản phẩm "${p.name}" hết hàng` })
        return prev
      }
      return [
        ...prev,
        {
          product_id: p.id,
          name: p.name,
          price: p.price,
          stock: p.stock,
          quantity: 1,
          image_url: p.image_url ?? null,
        },
      ]
    })
    setProductHits([])
  }

  const updateLineQuantity = (productId: number, quantity: number) => {
    setOrderLines((prev) =>
      prev.map((l) => {
        if (l.product_id !== productId) return l
        const q = Math.max(1, Math.min(l.stock, Math.floor(quantity) || 1))
        return { ...l, quantity: q }
      })
    )
  }

  const removeLine = (productId: number) => {
    setOrderLines((prev) => prev.filter((l) => l.product_id !== productId))
  }

  const submitCreateOrder = async () => {
    if (selectedUserId === '') {
      setMessage({ type: 'error', text: 'Vui lòng chọn khách hàng' })
      return
    }
    if (orderLines.length === 0) {
      setMessage({ type: 'error', text: 'Thêm ít nhất một sản phẩm' })
      return
    }

    setCreateLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          items: orderLines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
          payment_method: 'admin',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Tạo đơn thành công' })
        setShowCreateModal(false)
        fetchOrders()
      } else {
        setMessage({ type: 'error', text: data.error || 'Tạo đơn thất bại' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối khi tạo đơn' })
    } finally {
      setCreateLoading(false)
    }
  }

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
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-[#ee4d2d]">Quản lý đơn hàng</h1>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-sm text-sm font-medium bg-[#ee4d2d] text-white hover:bg-[#d7321a] transition-colors w-fit"
            >
              + Tạo đơn hàng
            </button>
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
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg my-8 max-h-[90vh] flex flex-col text-gray-900">
            <div className="p-6 overflow-y-auto flex-1">
              <h2 className="text-xl font-bold text-gray-800 mb-1">Tạo đơn hàng thay khách</h2>
              <p className="text-sm text-gray-600 mb-4">
                Đề xuất được gửi lên tab <strong>CTV</strong> của khách. Khách bấm <strong>Mua</strong> thì mới trừ ví và tạo đơn chờ duyệt trong mục Đơn hàng. Giỏ hàng không bị đụng tới.
              </p>

              {usersLoadError && (
                <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
                  {usersLoadError}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng *</label>
                <p className="text-xs text-gray-500 mb-2">
                  Chọn một khách trong danh sách bên dưới (có thể gõ để lọc theo tên, email, SĐT hoặc ID).
                </p>

                {selectedUser ? (
                  <div className="rounded-sm border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="text-sm">
                        <span className="font-semibold text-gray-900">#{selectedUser.id}</span>
                        <span className="text-gray-800"> — {selectedUser.name || '(Chưa tên)'}</span>
                        <p className="text-gray-600 text-xs mt-0.5">{selectedUser.email}</p>
                        {selectedUser.phone && (
                          <p className="text-gray-500 text-xs">{selectedUser.phone}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUserId('')
                          setCustomerSearch('')
                        }}
                        className="text-xs font-medium text-[#ee4d2d] hover:underline shrink-0"
                      >
                        Chọn lại
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-600 border-t border-gray-200 pt-2">
                      Số dư ví:{' '}
                      <span className="font-semibold text-[#ee4d2d]">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                          selectedUser.wallet_balance
                        )}
                      </span>
                      {linesTotal > 0 && (
                        <>
                          {' '}
                          · Tạm tính:{' '}
                          <span className="font-medium">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(linesTotal)}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Lọc: tên, email, SĐT, ID..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm mb-2 bg-white text-gray-900 placeholder:text-gray-400"
                      disabled={usersListLoading}
                    />
                    {usersListLoading ? (
                      <p className="text-sm text-gray-500 py-4 text-center border border-dashed border-gray-200 rounded-sm">
                        Đang tải danh sách khách...
                      </p>
                    ) : filteredCustomers.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4 text-center border border-dashed border-gray-200 rounded-sm">
                        {adminUsers.length === 0
                          ? 'Chưa có khách hàng.'
                          : 'Không tìm thấy khách phù hợp. Thử từ khóa khác.'}
                      </p>
                    ) : (
                      <ul className="max-h-52 overflow-y-auto border border-gray-200 rounded-sm divide-y divide-gray-100 bg-white shadow-inner">
                        {filteredCustomers.map((u) => (
                          <li key={u.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserId(u.id)
                                setCustomerSearch('')
                              }}
                              className="w-full text-left px-3 py-2.5 text-sm hover:bg-orange-50 transition-colors"
                            >
                              <span className="font-semibold text-gray-900">#{u.id}</span>
                              <span className="text-gray-800"> {u.name || '(Chưa tên)'}</span>
                              <span className="block text-xs text-gray-600 mt-0.5">{u.email}</span>
                              {u.phone && (
                                <span className="block text-xs text-gray-500">{u.phone}</span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {!customerSearch.trim() && adminUsers.length > filteredCustomers.length && (
                      <p className="text-xs text-gray-500 mt-1">
                        Hiển thị {filteredCustomers.length} / {adminUsers.length} khách. Gõ để lọc chính xác hơn.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giá trị đơn hàng (VNĐ) *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Nhập số tiền mục tiêu (vd. 500000 hoặc 500.000). Hệ thống gợi ý sản phẩm có{' '}
                  <strong>đơn giá</strong> gần giá trị đó nhất — bấm để thêm vào đơn.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Ví dụ: 350000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm bg-white text-gray-900 placeholder:text-gray-400 caret-gray-900"
                />
                {productSuggestLoading && (
                  <p className="text-xs text-gray-500 mt-1">Đang tải gợi ý...</p>
                )}
                {parseOrderValueVnd(productSearch) === null && productSearch.trim() !== '' && (
                  <p className="text-xs text-amber-700 mt-1">Nhập số nguyên dương (chỉ chữ số, có thể dấu . phân cách nghìn).</p>
                )}
                {productHits.length > 0 && (
                  <ul className="mt-2 max-h-[min(24rem,55vh)] overflow-y-auto border border-gray-200 rounded-sm divide-y divide-gray-100">
                    {productHits.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => addProductLine(p)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-900 hover:bg-orange-50 transition-colors"
                        >
                          <ProductThumb src={p.image_url} alt={p.name} size="md" />
                          <span className="min-w-0 flex-1">
                            <span className="font-medium text-gray-900 block">{p.name}</span>
                            <span className="text-gray-600 text-xs sm:text-sm">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.price)} ·
                              tồn {p.stock}
                            </span>
                            {p.price_distance != null && (
                              <span className="block text-xs text-gray-500 mt-0.5">
                                Chênh mục tiêu:{' '}
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                  p.price_distance
                                )}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {orderLines.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Sản phẩm trong đơn</p>
                  <ul className="space-y-2">
                    {orderLines.map((l) => (
                      <li
                        key={l.product_id}
                        className="flex flex-wrap items-center gap-3 border border-gray-200 rounded-sm px-3 py-2 text-sm"
                      >
                        <ProductThumb src={l.image_url} alt={l.name} size="md" />
                        <span className="flex-1 min-w-[120px] font-medium text-gray-800">{l.name}</span>
                        <label className="flex items-center gap-1 text-gray-600">
                          SL
                          <input
                            type="number"
                            min={1}
                            max={l.stock}
                            value={l.quantity}
                            onChange={(e) => updateLineQuantity(l.product_id, parseInt(e.target.value, 10))}
                            className="w-16 px-2 py-1 border border-gray-300 rounded-sm bg-white text-gray-900 tabular-nums"
                          />
                        </label>
                        <span className="text-[#ee4d2d] font-semibold">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                            l.price * l.quantity
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLine(l.product_id)}
                          className="text-red-600 text-xs hover:underline"
                        >
                          Xóa
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-3 justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={createLoading}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-sm hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={submitCreateOrder}
                disabled={createLoading}
                className="px-4 py-2 bg-[#ee4d2d] text-white rounded-sm hover:bg-[#d7321a] transition-colors disabled:opacity-50"
              >
                {createLoading ? 'Đang tạo...' : 'Tạo đơn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md text-gray-900">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] bg-white text-gray-900 placeholder:text-gray-400"
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

