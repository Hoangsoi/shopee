'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import BottomNavigation from '@/components/BottomNavigation'
import Link from 'next/link'
import Image from 'next/image'

interface CartItem {
  id: number
  product_id: number
  quantity: number
  name: string
  price: number
  original_price?: number
  image_url?: string
  stock: number
  subtotal: number
}

export default function CartPage() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalQuantity, setTotalQuantity] = useState(0)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)

  const fetchCart = useCallback(async () => {
    try {
      const response = await fetch('/api/cart')
      if (response.ok) {
        const data = await response.json()
        setCartItems(data.items || [])
        setTotal(data.total || 0)
        setTotalQuantity(data.totalQuantity || data.items?.reduce((sum: number, item: CartItem) => sum + item.quantity, 0) || 0)
      } else if (response.status === 401) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error fetching cart:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  const handleUpdateQuantity = async (cartItemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveItem(cartItemId)
      return
    }

    setUpdating(cartItemId)
    try {
      const response = await fetch('/api/cart', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cart_item_id: cartItemId,
          quantity: newQuantity,
        }),
      })

      if (response.ok) {
        fetchCart()
      } else {
        const data = await response.json()
        alert(data.error || 'Cập nhật thất bại')
      }
    } catch (error) {
      alert('Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setUpdating(null)
    }
  }

  const handleRemoveItem = async (cartItemId: number) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?')) {
      return
    }

    try {
      const response = await fetch(`/api/cart?id=${cartItemId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchCart()
      } else {
        alert('Xóa sản phẩm thất bại')
      }
    } catch (error) {
      alert('Có lỗi xảy ra. Vui lòng thử lại.')
    }
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      alert('Giỏ hàng trống')
      return
    }

    if (!confirm('Xác nhận đặt hàng?')) {
      return
    }

    try {
      const items = cartItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
      }))

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          payment_method: 'Ví điện tử',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Đặt hàng thành công! Mã đơn hàng: ${data.order.order_number}`)
        router.push('/orders')
      } else {
        alert(data.error || 'Đặt hàng thất bại')
      }
    } catch (error) {
      alert('Có lỗi xảy ra. Vui lòng thử lại.')
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
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
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Giỏ hàng</h1>
            {cartItems.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {cartItems.length} {cartItems.length === 1 ? 'sản phẩm' : 'sản phẩm'} • Tổng {totalQuantity} {totalQuantity === 1 ? 'món' : 'món'}
              </p>
            )}
          </div>
          <Link href="/" className="text-sm text-[#ee4d2d] hover:underline">
            Tiếp tục mua sắm
          </Link>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-gray-600 mb-4">Giỏ hàng của bạn đang trống</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-[#ee4d2d] text-white rounded-lg font-medium hover:bg-[#f05d40] transition-colors"
            >
              Mua sắm ngay
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm mb-4">
              {cartItems.map((item) => (
                <div key={item.id} className="p-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden relative">
                      {item.image_url && (item.image_url.startsWith('http://') || item.image_url.startsWith('https://') || item.image_url.startsWith('data:image/')) ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
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
                      <h3 className="font-medium text-sm text-gray-800 mb-1 line-clamp-2">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[#ee4d2d] font-bold">
                          {formatCurrency(item.price)}
                        </span>
                        {item.original_price && item.original_price > item.price && (
                          <span className="text-gray-400 text-xs line-through">
                            {formatCurrency(item.original_price)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            disabled={updating === item.id}
                            className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                          >
                            -
                          </button>
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            disabled={updating === item.id || item.quantity >= item.stock}
                            className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-[#ee4d2d] font-bold">
                            {formatCurrency(item.subtotal)}
                          </p>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-xs text-red-500 hover:text-red-700 mt-1"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 sticky bottom-20">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">Tổng cộng:</span>
                <span className="text-2xl font-bold text-[#ee4d2d]">
                  {formatCurrency(total)}
                </span>
              </div>
              <button
                className="w-full py-3 bg-[#ee4d2d] text-white rounded-lg font-medium hover:bg-[#f05d40] transition-colors"
                onClick={handleCheckout}
              >
                Thanh toán
              </button>
            </div>
          </>
        )}
      </div>
      <BottomNavigation />
    </div>
  )
}

