'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Product {
  id: number
  name: string
  price: number
  original_price?: number
  image_url?: string
  category_name?: string
  discount_percent?: number
}

interface ProductCardProps {
  product: Product
  hasPermission?: boolean
}

export default function ProductCard({ product, hasPermission = true }: ProductCardProps) {
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Ưu tiên sử dụng discount_percent từ category, nếu không có thì tính từ original_price
  const discount = product.discount_percent !== undefined && product.discount_percent !== null
    ? product.discount_percent
    : product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0

  const handleAddToCart = async () => {
    if (!hasPermission) {
      setMessage({ type: 'error', text: 'Bạn chưa có quyền mua hàng ở khu vực này. Vui lòng liên hệ admin.' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setAdding(true)
    setMessage(null)

    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: 1,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Đã thêm vào giỏ hàng!' })
        setTimeout(() => setMessage(null), 2000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Thêm vào giỏ hàng thất bại' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Có lỗi xảy ra. Vui lòng thử lại.' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="relative aspect-square bg-gray-100">
        <Image
          src={product.image_url || 'https://via.placeholder.com/300x300?text=Product'}
          alt={product.name}
          fill
          className="object-cover"
          unoptimized
        />
        {discount > 0 && (
          <div className="absolute top-2 right-2 bg-[#ee4d2d] text-white text-xs font-bold px-2 py-1 rounded">
            -{discount}%
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm text-gray-800 mb-2 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[#ee4d2d] font-bold text-lg">
            {new Intl.NumberFormat('vi-VN').format(product.price)}đ
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-gray-400 text-xs line-through">
              {new Intl.NumberFormat('vi-VN').format(product.original_price)}đ
            </span>
          )}
        </div>
        {product.category_name && (
          <div className="text-xs text-gray-500 mb-2">{product.category_name}</div>
        )}
        
        {message && (
          <div className={`text-xs py-1 px-2 rounded mb-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}>
            {message.text}
          </div>
        )}
        
        <button
          onClick={handleAddToCart}
          disabled={adding || !hasPermission}
          className={`w-full py-2 px-3 text-white text-xs font-medium rounded transition-colors ${
            hasPermission
              ? 'bg-[#ee4d2d] hover:bg-[#f05d40] disabled:opacity-50 disabled:cursor-not-allowed'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {adding ? 'Đang thêm...' : !hasPermission ? '🔒 Chưa có quyền' : 'Thêm vào giỏ'}
        </button>
      </div>
    </div>
  )
}

