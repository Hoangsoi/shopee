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
  const [calculatingProfit, setCalculatingProfit] = useState(false)
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
        console.log('Fetched investments data:', data)
        setInvestments(data.investments || [])
        setStats(data.stats || null)
        setIssues(data.issues || null)
      } else {
        const errorData = await response.json()
        console.error('Error response:', errorData)
        alert(`Lỗi: ${errorData.error || 'Không thể tải danh sách đầu tư'}`)
      }
    } catch (error) {
      console.error('Error fetching investments:', error)
      alert('Lỗi khi tải danh sách đầu tư. Vui lòng kiểm tra console để xem chi tiết.')
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

  const handleCalculateProfit = async () => {
    if (!confirm('Bạn có chắc chắn muốn tính lợi nhuận cho tất cả đầu tư đang hoạt động?')) {
      return
    }

    try {
      setCalculatingProfit(true)
      const response = await fetch('/api/cron/calculate-daily-profit', {
        method: 'GET',
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Đã tính lợi nhuận thành công!\n- Đã xử lý: ${data.processed_count} đầu tư`)
        fetchInvestments()
      } else {
        const error = await response.json()
        alert(`Lỗi: ${error.error || 'Không thể tính lợi nhuận'}`)
      }
    } catch (error) {
      console.error('Error calculating profit:', error)
      alert('Lỗi khi tính lợi nhuận')
    } finally {
      setCalculatingProfit(false)
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
        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gray-100 text-gray-800">
          Kết thúc
        </span>
      )
    }
    
    if (status === 'active') {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-800">
          Hoạt động
        </span>
      )
    }
    
    return (
      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gray-100 text-gray-800">
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
      <div className="p-3">
        <div className="mb-3">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Quản lý đầu tư</h2>
          
          {/* Thống kê - Compact */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              <div className="bg-white rounded shadow-sm p-2">
                <p className="text-xs text-gray-600">Tổng số</p>
                <p className="text-lg font-bold text-blue-600">{stats.total}</p>
                <p className="text-xs text-gray-500">
                  {stats.active_count} đang hoạt động | {stats.completed_count} kết thúc
                </p>
              </div>

              <div className="bg-white rounded shadow-sm p-2">
                <p className="text-xs text-gray-600">Đang đầu tư</p>
                <p className="text-sm font-bold text-green-600">
                  {formatCurrency(stats.total_active_amount)}
                </p>
                <p className="text-xs text-gray-500">
                  LN: {formatCurrency(stats.total_active_profit)}
                </p>
              </div>

              <div className="bg-white rounded shadow-sm p-2">
                <p className="text-xs text-gray-600">Đã kết thúc</p>
                <p className="text-sm font-bold text-gray-600">
                  {formatCurrency(stats.total_completed_amount)}
                </p>
                <p className="text-xs text-gray-500">
                  LN: {formatCurrency(stats.total_completed_profit)}
                </p>
              </div>

              <div className="bg-white rounded shadow-sm p-2">
                <p className="text-xs text-gray-600">Vấn đề</p>
                {issues && (issues.expired_but_active > 0 || issues.not_expired_but_completed > 0) ? (
                  <>
                    <p className="text-lg font-bold text-red-600">
                      {issues.expired_but_active + issues.not_expired_but_completed}
                    </p>
                    <p className="text-xs text-red-600">
                      {issues.expired_but_active > 0 && `${issues.expired_but_active} đáo hạn`}
                      {issues.expired_but_active > 0 && issues.not_expired_but_completed > 0 && ' | '}
                      {issues.not_expired_but_completed > 0 && `${issues.not_expired_but_completed} sai trạng thái`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-green-600">0</p>
                    <p className="text-xs text-green-600">OK</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Nút cập nhật trạng thái và tính lợi nhuận - Compact */}
          <div className="mb-2 flex gap-2 flex-wrap">
            <button
              onClick={handleUpdateStatus}
              disabled={updating}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'Đang cập nhật...' : '🔄 Cập nhật trạng thái'}
            </button>
            <button
              onClick={handleCalculateProfit}
              disabled={calculatingProfit}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {calculatingProfit ? 'Đang tính...' : '💰 Tính lợi nhuận'}
            </button>
          </div>

          {/* Filters - Compact */}
          <div className="mb-2 flex gap-2 items-end">
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Trạng thái:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang hoạt động</option>
                <option value="completed">Kết thúc</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Tìm kiếm:
              </label>
              <input
                type="text"
                placeholder="Email, tên, SĐT, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Danh sách đầu tư - Compact */}
        <div className="bg-white rounded shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                    ID
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                    Người dùng
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                    Số tiền
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                    Lãi
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                    Ngày
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                    Lợi nhuận
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                    Đáo hạn
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                    Tạo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvestments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-2 py-4 text-center text-gray-500 text-xs">
                      Không có đầu tư nào
                    </td>
                  </tr>
                ) : (
                  filteredInvestments.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-gray-900">
                        #{inv.id}
                      </td>
                      <td className="px-2 py-1 text-xs text-gray-900">
                        <div className="font-medium">{inv.user_name || 'N/A'}</div>
                        <div className="text-gray-500 text-[10px]">{inv.user_email}</div>
                        {inv.user_phone && (
                          <div className="text-gray-500 text-[10px]">{inv.user_phone}</div>
                        )}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs font-semibold text-gray-900">
                        {formatCurrency(inv.amount)}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {inv.daily_profit_rate}%
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {inv.investment_days}d
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs font-semibold text-green-600">
                        {(() => {
                          // Nếu total_profit = 0 nhưng đầu tư đã completed, tính lại
                          if (inv.total_profit === 0 && inv.status === 'completed' && inv.amount && inv.daily_profit_rate && inv.investment_days) {
                            const calculatedProfit = inv.amount * (inv.daily_profit_rate / 100) * inv.investment_days;
                            if (calculatedProfit > 0) {
                              return formatCurrency(calculatedProfit);
                            }
                          }
                          return formatCurrency(inv.total_profit);
                        })()}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        {getStatusBadge(inv.status, inv.maturity_date)}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {inv.maturity_date ? new Date(inv.maturity_date).toLocaleDateString('vi-VN') : 'N/A'}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                        {new Date(inv.created_at).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination info - Compact */}
        {filteredInvestments.length > 0 && (
          <div className="mt-2 text-xs text-gray-600">
            Hiển thị {filteredInvestments.length} / {investments.length} đầu tư
          </div>
        )}
      </div>
    </div>
  )
}

