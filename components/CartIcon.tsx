'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CartIcon() {
  const router = useRouter()
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    fetchCartCount()
    
    // Refresh cart count mỗi 5 giây
    const interval = setInterval(fetchCartCount, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchCartCount = async () => {
    try {
      const response = await fetch('/api/cart')
      if (response.ok) {
        const data = await response.json()
        // Sử dụng totalQuantity (tổng số lượng) thay vì count (số loại)
        setCartCount(data.totalQuantity || data.count || 0)
      }
    } catch (error) {
      // Ignore errors (user might not be logged in)
    }
  }

  return (
    <Link href="/cart" className="relative">
      <div className="relative">
        <span className="text-2xl">🛒</span>
        {cartCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-[#ee4d2d] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </div>
    </Link>
  )
}

