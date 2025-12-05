'use client'

import { useState, useEffect, useCallback } from 'react'
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
  { path: '/admin/category-permissions', label: 'Phân quyền', icon: '🔐', countKey: null },
  { path: '/admin/categories', label: 'Danh mục', icon: '📁', countKey: null },
  { path: '/admin/products', label: 'Sản phẩm', icon: '🛍️', countKey: null },
  { path: '/admin/orders', label: 'Đơn hàng', icon: '📦', countKey: 'pendingOrders' },
  { path: '/admin/transactions', label: 'Giao dịch', icon: '💳', countKey: 'pendingWithdrawals' },
  { path: '/admin/investments', label: 'Đầu tư', icon: '📈', countKey: null },
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

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        const userData = data.user
        
        // Kiểm tra role (trim và lowercase để tránh lỗi)
        const userRole = userData?.role?.toString().trim().toLowerCase()
        
        // Debug logging
        console.log('Admin layout checkAuth:', {
          email: userData?.email,
          role: userData?.role,
          roleNormalized: userRole,
          isAdmin: userRole === 'admin'
        })
        
        if (userRole !== 'admin') {
          console.log('User is not admin, redirecting to /')
          router.push('/')
          return
        }
        
        console.log('User is admin, setting user data')
        setUser(userData)
      } else {
        console.log('Auth check failed, redirecting to /login')
        router.push('/login')
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  const fetchNotificationCounts = useCallback(async () => {
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching notification counts:', error)
      }
    }
  }, [])

  useEffect(() => {
    checkAuth()
    fetchNotificationCounts()
  }, [checkAuth, fetchNotificationCounts])

  // Real-time notifications với Server-Sent Events và fallback polling
  useEffect(() => {
    if (!user) return

    let eventSource: EventSource | null = null
    let pollingInterval: NodeJS.Timeout | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null
    let reconnectAttempts = 0
    const maxReconnectAttempts = 5
    const reconnectDelay = 3000 // 3 giây

    // Hàm fallback về polling
    const startPolling = () => {
      if (pollingInterval) clearInterval(pollingInterval)
      if (process.env.NODE_ENV === 'development') {
        console.log('Using polling fallback for notifications')
      }
      pollingInterval = setInterval(fetchNotificationCounts, 5000)
    }

    // Hàm tạo SSE connection với retry logic
    const connectSSE = () => {
      // Nếu đã có polling, không cần retry SSE
      if (pollingInterval) return

      try {
        // Kiểm tra xem EventSource có được hỗ trợ không
        if (typeof EventSource === 'undefined') {
          if (process.env.NODE_ENV === 'development') {
            console.warn('EventSource not supported, using polling')
          }
          startPolling()
          return
        }

        // Đóng connection cũ nếu có
        if (eventSource) {
          eventSource.close()
          eventSource = null
        }

        // Sử dụng SSE cho real-time updates
        eventSource = new EventSource('/api/admin/notifications-stream')

        eventSource.onopen = () => {
          // Reset reconnect attempts khi kết nối thành công
          reconnectAttempts = 0
          if (process.env.NODE_ENV === 'development') {
            console.log('SSE connection established')
          }
        }

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            setNotificationCounts({
              pendingOrders: data.pendingOrders || 0,
              pendingWithdrawals: data.pendingWithdrawals || 0,
              newUsers: data.newUsers || 0,
            })
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error parsing SSE data:', error)
            }
          }
        }

        eventSource.onerror = (error) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('SSE error:', error)
          }

          // Đóng connection hiện tại
          if (eventSource) {
            eventSource.close()
            eventSource = null
          }

          // Retry với exponential backoff
          reconnectAttempts++
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = reconnectDelay * Math.pow(2, reconnectAttempts - 1)
            if (process.env.NODE_ENV === 'development') {
              console.log(`Retrying SSE connection in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`)
            }
            reconnectTimeout = setTimeout(() => {
              connectSSE()
            }, delay)
          } else {
            // Sau nhiều lần retry thất bại, chuyển sang polling
            if (process.env.NODE_ENV === 'development') {
              console.log('Max reconnect attempts reached, falling back to polling')
            }
            startPolling()
          }
        }

        // Timeout nếu không nhận được data trong 15 giây
        const connectionTimeout = setTimeout(() => {
          if (eventSource && eventSource.readyState === EventSource.CONNECTING) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('SSE connection timeout, falling back to polling')
            }
            eventSource.close()
            eventSource = null
            startPolling()
          }
        }, 15000)

        // Clear timeout khi nhận được message đầu tiên
        const firstMessageHandler = () => {
          clearTimeout(connectionTimeout)
          eventSource?.removeEventListener('message', firstMessageHandler)
        }
        eventSource.addEventListener('message', firstMessageHandler, { once: true })
      } catch (error) {
        // Fallback to polling nếu SSE không support hoặc lỗi
        if (process.env.NODE_ENV === 'development') {
          console.warn('SSE initialization failed, using polling:', error)
        }
        startPolling()
      }
    }

    // Bắt đầu kết nối SSE
    connectSSE()

    // Cleanup
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (eventSource) {
        eventSource.close()
      }
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [user, fetchNotificationCounts])

  const handleLogout = async () => {
    try {
      // Reset Crisp session before logout to clear chat history
      if (typeof window !== 'undefined' && window.$crisp) {
        window.$crisp.push(['do', 'session:reset'])
        window.$crisp.push(['set', 'user:email', ''])
        window.$crisp.push(['set', 'user:nickname', ''])
        window.$crisp.push(['set', 'session:data', []])
        window.$crisp.push(['do', 'chat:hide'])
      }
      
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

