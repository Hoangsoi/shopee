'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import BottomNavigation from '@/components/BottomNavigation'
import Link from 'next/link'

interface Order {
  id: number
  order_number: string
  total_amount: number
  status: string
  payment_method?: string
  item_count: number
  commission?: number
  created_at: string
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/orders')
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
      } else if (response.status === 401) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  const getStatusLabel = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      pending: 'Chờ xử lý',
      confirmed: 'Đã xác nhận',
      shipping: 'Đang giao hàng',
      delivered: 'Đã giao hàng',
      cancelled: 'Đã hủy',
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string): string => {
    const colorMap: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      shipping: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] pb-20 flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 pb-24">
      <div className="container mx-auto px-4 py-4 max-w-4xl">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#ee4d2d] via-[#ff6b4a] to-[#ee4d2d] rounded-2xl shadow-xl mb-6 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📦</span>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Đơn hàng của tôi</h1>
                <p className="text-white/90 text-sm mt-1">{orders.length} đơn hàng</p>
              </div>
            </div>
            <Link 
              href="/" 
              className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/30 transition-all text-sm md:text-base flex items-center gap-2"
            >
              <span>🛍️</span>
              <span className="hidden md:inline">Mua sắm</span>
            </Link>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Chưa có đơn hàng</h2>
            <p className="text-sm md:text-base text-gray-600 mb-6">Bắt đầu mua sắm để xem đơn hàng của bạn tại đây</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ee4d2d] to-[#ff6b4a] text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm md:text-base"
            >
              <span>🛒</span>
              <span>Mua sắm ngay</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden border border-gray-100"
              >
                <div className="p-4 md:p-6">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">📋</span>
                        <h3 className="font-bold text-gray-800 text-base md:text-lg truncate">
                          {order.order_number}
                        </h3>
                      </div>
                      <p className="text-xs md:text-sm text-gray-500 flex items-center gap-1">
                        <span>🕐</span>
                        <span>
                          {new Date(order.created_at).toLocaleString('vi-VN', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-bold flex-shrink-0 ml-3 ${getStatusColor(order.status)} shadow-sm`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  {/* Content Row */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📦</span>
                        <span className="text-sm md:text-base text-gray-700 font-medium">
                          {order.item_count} sản phẩm
                        </span>
                      </div>
                      {order.status === 'confirmed' && order.commission && order.commission > 0 && (
                        <div className="flex items-center gap-1 px-3 py-1 bg-green-50 rounded-full">
                          <span className="text-sm">🎁</span>
                          <span className="text-xs md:text-sm text-green-700 font-bold">
                            HH: {formatCurrency(order.commission)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg md:text-xl font-bold text-[#ee4d2d] mb-1">
                        {formatCurrency(order.total_amount)}
                      </div>
                      {order.status === 'confirmed' && order.commission && order.commission > 0 && (
                        <div className="text-xs md:text-sm text-green-600 font-semibold flex items-center justify-end gap-1">
                          <span>+</span>
                          <span>{formatCurrency(order.commission)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <BottomNavigation />
    </div>
  )
}
