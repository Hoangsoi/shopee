'use client'

import { useState, useEffect, useCallback } from 'react'

interface Stats {
  totalUsers: number
  newUsers: number
  totalOrders: number
  pendingOrders: number
  totalRevenue: number
  totalTransactions: number
  pendingTransactions: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    
    // Tối ưu: Giảm polling từ 5s xuống 30s để giảm tải server
    // Dashboard không cần real-time quá nhanh, 30s là đủ
    const interval = setInterval(fetchStats, 30000) // 30 giây
    return () => clearInterval(interval)
  }, [fetchStats])

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Tổng quan</h2>
          
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Tổng số người dùng</p>
                    <p className="text-3xl font-bold text-[#ee4d2d]">{stats.totalUsers}</p>
                    {stats.newUsers > 0 && (
                      <p className="text-xs text-green-600 font-bold mt-1">
                        ✨ {stats.newUsers} khách đăng ký mới (24h)
                      </p>
                    )}
                  </div>
                  <div className="text-4xl relative">
                    👥
                    {stats.newUsers > 0 && (
                      <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {stats.newUsers > 99 ? '99+' : stats.newUsers}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Tổng số đơn hàng</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.totalOrders}</p>
                    {stats.pendingOrders > 0 && (
                      <p className="text-xs text-red-600 font-bold mt-1 animate-pulse">
                        ⚠️ {stats.pendingOrders} đơn chờ phê duyệt
                      </p>
                    )}
                  </div>
                  <div className="text-4xl relative">
                    📦
                    {stats.pendingOrders > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {stats.pendingOrders > 99 ? '99+' : stats.pendingOrders}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Tổng doanh thu</p>
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(stats.totalRevenue)}
                    </p>
                  </div>
                  <div className="text-4xl">💰</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Tổng giao dịch</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.totalTransactions}</p>
                    {stats.pendingTransactions > 0 && (
                      <p className="text-xs text-red-600 font-bold mt-1 animate-pulse">
                        ⚠️ {stats.pendingTransactions} lệnh rút tiền chờ duyệt
                      </p>
                    )}
                  </div>
                  <div className="text-4xl relative">
                    💳
                    {stats.pendingTransactions > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {stats.pendingTransactions > 99 ? '99+' : stats.pendingTransactions}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Truy cập nhanh</h2>
          <p className="text-sm text-gray-600 mb-4">
            Sử dụng menu bên trái để điều hướng đến các trang quản lý
          </p>
        </div>
      </div>
    </div>
  )
}

