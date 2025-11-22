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
    <div className="min-h-screen bg-[#f5f5f5] pb-20">
      <div className="container mx-auto px-3 py-2">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-lg font-bold text-gray-800">Đơn hàng</h1>
          <Link href="/" className="text-xs text-[#ee4d2d] hover:underline">
            Mua sắm
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">📦</div>
            <p className="text-sm text-gray-600 mb-3">Bạn chưa có đơn hàng nào</p>
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-[#ee4d2d] text-white rounded text-sm font-medium hover:bg-[#f05d40] transition-colors"
            >
              Mua sắm ngay
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white rounded shadow-sm p-2 hover:shadow transition-shadow"
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-800 text-sm truncate">
                      {order.order_number}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleString('vi-VN', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ml-2 ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-600">
                    {order.item_count} sp
                    {order.status === 'confirmed' && order.commission && order.commission > 0 && (
                      <div className="text-xs text-green-600 font-medium">
                        HH: {new Intl.NumberFormat('vi-VN').format(order.commission)}đ
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-[#ee4d2d]">
                      {new Intl.NumberFormat('vi-VN').format(order.total_amount)}đ
                    </div>
                    {order.status === 'confirmed' && order.commission && order.commission > 0 && (
                      <div className="text-xs text-green-600 font-medium">
                        +{new Intl.NumberFormat('vi-VN').format(order.commission)}đ
                      </div>
                    )}
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
