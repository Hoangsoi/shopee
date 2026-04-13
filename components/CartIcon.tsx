'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const POLL_MS = 45000

export default function CartIcon() {
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null

    const fetchCartCount = async (): Promise<boolean> => {
      try {
        const response = await fetch('/api/cart')
        if (cancelled) return false
        if (response.ok) {
          const data = await response.json()
          setCartCount(data.totalQuantity || data.count || 0)
          return true
        }
        if (response.status === 401) {
          setCartCount(0)
          return false
        }
      } catch {
        // offline / network
      }
      return false
    }

    const tick = async () => {
      if (typeof document !== 'undefined' && document.hidden) return
      await fetchCartCount()
    }

    ;(async () => {
      const loggedIn = await fetchCartCount()
      if (cancelled || !loggedIn) return
      intervalId = setInterval(tick, POLL_MS)
    })()

    const onResume = () => {
      if (!document.hidden) void fetchCartCount()
    }
    document.addEventListener('visibilitychange', onResume)
    window.addEventListener('focus', onResume)

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onResume)
      window.removeEventListener('focus', onResume)
    }
  }, [])

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
