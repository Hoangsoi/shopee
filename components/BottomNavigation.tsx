'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { path: '/', label: 'Trang chủ', icon: '🏠' },
  { path: '/history', label: 'Lịch sử', icon: '📜' },
  { path: '/orders', label: 'Đơn hàng', icon: '📦' },
  { path: '/support', label: 'CSKH', icon: '💬' },
  { path: '/profile', label: 'Của tôi', icon: '👤' },
]

export default function BottomNavigation() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-5">
        {navItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center py-2 px-1 transition-colors ${
                isActive ? 'text-[#ee4d2d]' : 'text-gray-600'
              }`}
            >
              <span className="text-2xl mb-1">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

