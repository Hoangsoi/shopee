'use client'

import { useState, useEffect, useCallback } from 'react'

interface Investment {
  id: number
  user_id: number
  user_email: string
  user_name: string
  user_phone: string
  amount: number
  daily_profit_rate: number
  investment_days: number
  total_profit: number
  status: string
  maturity_date: string | null
  created_at: string
  updated_at: string
  last_profit_calculated_at: string | null
}

interface InvestmentStats {
  total: number
  active_count: number
  completed_count: number
  total_active_amount: number
  total_completed_amount: number
  total_active_profit: number
  total_completed_profit: number
}

interface InvestmentIssues {
  expired_but_active: number
  not_expired_but_completed: number
}

export default function AdminInvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [stats, setStats] = useState<InvestmentStats | null>(null)
  const [issues, setIssues] = useState<InvestmentIssues | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchInvestments = useCallback(async () => {
    try {
      setLoading(true)
      const url = new URL('/api/admin/investments', window.location.origin)
      if (statusFilter !== 'all') {
        url.searchParams.set('status', statusFilter)
      }
      
      const response = await fetch(url.toString())
      if (response.ok) {
        const data = await response.json()
        setInvestments(data.investments || [])
        setStats(data.stats || null)
        setIssues(data.issues || null)
      }
    } catch (error) {
      console.error('Error fetching investments:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchInvestments()
  }, [fetchInvestments])

  const handleUpdateStatus = async () => {
    if (!confirm('Bạn có chắc chắn muốn cập nhật trạng thái tất cả đầu tư?')) {
      return
    }

    try {
      setUpdating(true)
      const response = await fetch('/api/admin/investments/update-status', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Đã cập nhật thành công!\n- Đã đáo hạn: ${data.updated.expired}\n- Đã kích hoạt lại: ${data.updated.reactivated}`)
        fetchInvestments()
      } else {
        const error = await response.json()
        alert(`Lỗi: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Lỗi khi cập nhật trạng thái')
    } finally {
      setUpdating(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    })
  }

  const getStatusBadge = (status: string, maturityDate: string | null) => {
    const isExpired = maturityDate && new Date(maturityDate) <= new Date()
    
    if (status === 'completed' || isExpired) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
          Kết thúc
        </span>
      )
    }
    
    if (status === 'active') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          Đang hoạt động
        </span>
      )
    }
    
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
        {status}
      </span>
    )
  }

  const filteredInvestments = investments.filter((inv) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      inv.user_email?.toLowerCase().includes(search) ||
      inv.user_name?.toLowerCase().includes(search) ||
      inv.user_phone?.toLowerCase().includes(search) ||
      inv.id.toString().includes(search)
    )
  })

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
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Quản lý đầu tư</h2>
          
          {/* Thống kê */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <p className="text-sm text-gray-600 mb-1">Tổng số đầu tư</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Đang hoạt động: {stats.active_count} | Kết thúc: {stats.completed_count}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <p className="text-sm text-gray-600 mb-1">Tổng tiền đang đầu tư</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.total_active_amount)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Lợi nhuận: {formatCurrency(stats.total_active_profit)}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <p className="text-sm text-gray-600 mb-1">Tổng tiền đã kết thúc</p>
                <p className="text-2xl font-bold text-gray-600">
                  {formatCurrency(stats.total_completed_amount)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Lợi nhuận: {formatCurrency(stats.total_completed_profit)}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <p className="text-sm text-gray-600 mb-1">Vấn đề cần xử lý</p>
                {issues && (issues.expired_but_active > 0 || issues.not_expired_but_completed > 0) ? (
                  <>
                    <p className="text-2xl font-bold text-red-600">
                      {issues.expired_but_active + issues.not_expired_but_completed}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      {issues.expired_but_active > 0 && `${issues.expired_but_active} đã đáo hạn nhưng vẫn active`}
                      {issues.expired_but_active > 0 && issues.not_expired_but_completed > 0 && ' | '}
                      {issues.not_expired_but_completed > 0 && `${issues.not_expired_but_completed} chưa đáo hạn nhưng đã completed`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-green-600">0</p>
                    <p className="text-xs text-green-600 mt-1">Không có vấn đề</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Nút cập nhật trạng thái */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={handleUpdateStatus}
              disabled={updating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'Đang cập nhật...' : '🔄 Cập nhật trạng thái tất cả'}
            </button>
          </div>

          {/* Filters */}
          <div className="mb-4 flex gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lọc theo trạng thái:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang hoạt động</option>
                <option value="completed">Kết thúc</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tìm kiếm:
              </label>
              <input
                type="text"
                placeholder="Email, tên, SĐT hoặc ID đầu tư..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Danh sách đầu tư */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Người dùng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Số tiền
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lãi suất
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Số ngày
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lợi nhuận
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày đáo hạn
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày tạo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvestments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      Không có đầu tư nào
                    </td>
                  </tr>
                ) : (
                  filteredInvestments.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{inv.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{inv.user_name || 'N/A'}</div>
                          <div className="text-gray-500 text-xs">{inv.user_email}</div>
                          {inv.user_phone && (
                            <div className="text-gray-500 text-xs">{inv.user_phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(inv.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {inv.daily_profit_rate}%/ngày
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {inv.investment_days} ngày
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                        {formatCurrency(inv.total_profit)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {getStatusBadge(inv.status, inv.maturity_date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(inv.maturity_date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(inv.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination info */}
        {filteredInvestments.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Hiển thị {filteredInvestments.length} / {investments.length} đầu tư
          </div>
        )}
      </div>
    </div>
  )
}

