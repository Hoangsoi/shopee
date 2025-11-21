'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: number
  email: string
  name: string
  role: string
}

const menuItems = [
  { path: '/admin/dashboard', label: 'Tổng quan', icon: '📊', countKey: null },
  { path: '/admin/users', label: 'Người dùng', icon: '👥', countKey: 'newUsers' },
  { path: '/admin/categories', label: 'Danh mục', icon: '📁', countKey: null },
  { path: '/admin/products', label: 'Sản phẩm', icon: '🛍️', countKey: null },
  { path: '/admin/orders', label: 'Đơn hàng', icon: '📦', countKey: 'pendingOrders' },
  { path: '/admin/transactions', label: 'Giao dịch', icon: '💳', countKey: 'pendingWithdrawals' },
  { path: '/admin/bank-accounts', label: 'Ngân hàng', icon: '🏦', countKey: null },
  { path: '/admin/notifications', label: 'Thông báo', icon: '📢', countKey: null },
  { path: '/admin/banners', label: 'Banner', icon: '🖼️', countKey: null },
  { path: '/admin/settings', label: 'Cài đặt', icon: '⚙️', countKey: null },
]

interface NotificationCounts {
  pendingOrders: number
  pendingWithdrawals: number
  newUsers: number
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notificationCounts, setNotificationCounts] = useState<NotificationCounts>({
    pendingOrders: 0,
    pendingWithdrawals: 0,
    newUsers: 0,
  })

  useEffect(() => {
    checkAuth()
    fetchNotificationCounts()
    
    // Cập nhật real-time mỗi 5 giây
    const interval = setInterval(fetchNotificationCounts, 5000)
    return () => clearInterval(interval)
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        const userData = data.user
        
        if (userData.role !== 'admin') {
          router.push('/')
          return
        }
        
        setUser(userData)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchNotificationCounts = async () => {
    try {
      const response = await fetch('/api/admin/notifications-count')
      if (response.ok) {
        const data = await response.json()
        setNotificationCounts({
          pendingOrders: data.pendingOrders || 0,
          pendingWithdrawals: data.pendingWithdrawals || 0,
          newUsers: data.newUsers || 0,
        })
      }
    } catch (error) {
      // Ignore errors (silent fail)
      console.error('Error fetching notification counts:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const getCountForMenuItem = (countKey: string | null): number => {
    if (!countKey) return 0
    return notificationCounts[countKey as keyof NotificationCounts] || 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex">
      {/* Sidebar */}
      <div className={`bg-white shadow-lg transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-20'
      } flex flex-col fixed h-screen z-50`}>
        {/* Logo/Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-[#ee4d2d]">Đại Lý Shopee</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-xl">{sidebarOpen ? '◀' : '▶'}</span>
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200">
          {sidebarOpen ? (
            <div>
              <p className="text-sm font-semibold text-gray-800">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-10 h-10 bg-[#ee4d2d] rounded-full flex items-center justify-center text-white font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.path
            const count = getCountForMenuItem(item.countKey)
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors relative ${
                  isActive
                    ? 'bg-[#ee4d2d] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl flex-shrink-0 relative">
                  {item.icon}
                  {count > 0 && (
                    <span className={`absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${
                      isActive ? 'bg-white text-[#ee4d2d]' : ''
                    }`}>
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </span>
                {sidebarOpen && (
                  <span className="font-medium flex-1">{item.label}</span>
                )}
                {sidebarOpen && count > 0 && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-white text-[#ee4d2d]' : 'bg-red-500 text-white'
                  }`}>
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-red-50 hover:text-red-600 ${
              !sidebarOpen && 'justify-center'
            }`}
          >
            <span className="text-xl">🚪</span>
            {sidebarOpen && <span className="font-medium">Đăng xuất</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${
        sidebarOpen ? 'ml-64' : 'ml-20'
      }`}>
        {children}
      </div>
    </div>
  )
}

