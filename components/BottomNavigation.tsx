'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

const navItems = [
  { path: '/', label: 'Trang chủ', icon: '🏠' },
  { path: '/history', label: 'Lịch sử', icon: '📜' },
  { path: '/orders', label: 'Đơn hàng', icon: '📦' },
  { path: '/ctv', label: 'CTV', icon: '🤝' },
  { path: '/support', label: 'CSKH', icon: '💬' },
  { path: '/profile', label: 'Của tôi', icon: '👤' },
]

const CTV_POLL_MS = 120000

export default function BottomNavigation() {
  const pathname = usePathname()
  const [ctvCount, setCtvCount] = useState(0)
  const pathnameRef = useRef(pathname)
  const prevPathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (typeof document !== 'undefined' && document.hidden) return
      // Trang /ctv đã gọi /api/ctv/proposals — không cần poll count (giảm gọi API trùng)
      if (pathnameRef.current === '/ctv') return
      try {
        const res = await fetch('/api/ctv/proposals/count')
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled) setCtvCount(typeof data.count === 'number' ? data.count : 0)
      } catch {
        if (!cancelled) setCtvCount(0)
      }
    }

    load()
    const t = setInterval(load, CTV_POLL_MS)
    const onResume = () => {
      if (!document.hidden) void load()
    }
    document.addEventListener('visibilitychange', onResume)
    window.addEventListener('focus', onResume)
    return () => {
      cancelled = true
      clearInterval(t)
      document.removeEventListener('visibilitychange', onResume)
      window.removeEventListener('focus', onResume)
    }
  }, [])

  // Rời tab CTV → cập nhật badge một lần (không đợi tới chu kỳ 120s)
  useEffect(() => {
    const prev = prevPathnameRef.current
    prevPathnameRef.current = pathname
    if (prev === '/ctv' && pathname !== '/ctv') {
      if (typeof document !== 'undefined' && document.hidden) return
      ;(async () => {
        try {
          const res = await fetch('/api/ctv/proposals/count')
          if (!res.ok) return
          const data = await res.json()
          setCtvCount(typeof data.count === 'number' ? data.count : 0)
        } catch {
          setCtvCount(0)
        }
      })()
    }
  }, [pathname])

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-6">
        {navItems.map((item) => {
          const isActive = pathname === item.path
          const showBadge = item.path === '/ctv' && ctvCount > 0
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`relative flex flex-col items-center justify-center py-1.5 px-0.5 transition-colors ${
                isActive ? 'text-[#ee4d2d]' : 'text-gray-600'
              }`}
            >
              {showBadge && (
                <span className="absolute top-1 right-1/2 translate-x-3 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#ee4d2d] text-white text-[10px] font-bold leading-none">
                  {ctvCount > 9 ? '9+' : ctvCount}
                </span>
              )}
              <span className="text-xl mb-0.5 leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
