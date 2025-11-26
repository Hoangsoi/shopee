'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import BottomNavigation from '@/components/BottomNavigation'
import Link from 'next/link'
import Image from 'next/image'

interface OrderItem {
  id: number
  product_id: number
  product_name: string
  product_price: number
  quantity: number
  subtotal: number
  image_url?: string
}

interface Order {
  id: number
  order_number: string
  total_amount: number
  status: string
  payment_method?: string
  shipping_address?: string
  notes?: string
  created_at: string
  items: OrderItem[]
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchOrderDetail = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${params.orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data.order)
      } else if (response.status === 401) {
        router.push('/login')
      } else if (response.status === 404) {
        router.push('/orders')
      }
    } catch (error) {
      console.error('Error fetching order detail:', error)
    } finally {
      setLoading(false)
    }
  }, [params.orderId, router])

  useEffect(() => {
    if (params.orderId) {
      fetchOrderDetail()
    }
  }, [params.orderId, fetchOrderDetail])

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

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Không tìm thấy đơn hàng</p>
          <Link
            href="/orders"
            className="text-[#ee4d2d] hover:underline"
          >
            Quay lại danh sách đơn hàng
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-20">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Chi tiết đơn hàng</h1>
          <Link href="/orders" className="text-sm text-[#ee4d2d] hover:underline">
            Quay lại
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-4">
          <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200">
            <div>
              <h2 className="font-semibold text-gray-800 mb-1">
                Đơn hàng: {order.order_number}
              </h2>
              <p className="text-sm text-gray-500">
                Ngày đặt: {new Date(order.created_at).toLocaleString('vi-VN')}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
          </div>

          <div className="space-y-4 mb-4">
            <h3 className="font-semibold text-gray-800">Sản phẩm</h3>
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 flex-shrink-0 bg-gray-200 rounded overflow-hidden relative">
                  {item.image_url && (item.image_url.startsWith('http://') || item.image_url.startsWith('https://') || item.image_url.startsWith('data:image/')) ? (
                    <Image
                      src={item.image_url}
                      alt={item.product_name}
                      fill
                      className="object-cover"
                      unoptimized={item.image_url.startsWith('data:image/')}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        img.style.display = 'none'
                        const parent = img.parentElement
                        if (parent && !parent.querySelector('.image-placeholder')) {
                          const placeholder = document.createElement('div')
                          placeholder.className = 'image-placeholder w-full h-full flex items-center justify-center text-xs text-gray-400'
                          placeholder.textContent = '📦'
                          parent.appendChild(placeholder)
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-2xl">📦</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-gray-800 mb-1 line-clamp-2">
                    {item.product_name}
                  </h4>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {formatCurrency(item.product_price)} × {item.quantity}
                    </span>
                    <span className="font-bold text-[#ee4d2d]">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {order.shipping_address && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2">Địa chỉ giao hàng</h3>
              <p className="text-sm text-gray-600">{order.shipping_address}</p>
            </div>
          )}

          {order.payment_method && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2">Phương thức thanh toán</h3>
              <p className="text-sm text-gray-600">{order.payment_method}</p>
            </div>
          )}

          {order.notes && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2">Ghi chú</h3>
              <p className="text-sm text-gray-600">{order.notes}</p>
            </div>
          )}

          <div className="flex justify-between items-center pt-4">
            <span className="text-lg font-semibold text-gray-800">Tổng cộng:</span>
            <span className="text-2xl font-bold text-[#ee4d2d]">
              {formatCurrency(order.total_amount)}
            </span>
          </div>
        </div>
      </div>
      <BottomNavigation />
    </div>
  )
}

