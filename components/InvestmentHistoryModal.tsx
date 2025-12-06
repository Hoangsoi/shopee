'use client'

import { useState, useEffect } from 'react'
import CountdownTimer from './CountdownTimer'

interface Investment {
  id: number
  amount: number
  daily_profit_rate: number
  investment_days: number
  total_profit: number
  status: string
  maturity_date: string | null
  created_at: string
  updated_at: string
}

interface ReturnTransaction {
  id: number
  type: string
  amount: number
  description: string
  created_at: string
}

interface InvestmentHistoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function InvestmentHistoryModal({ isOpen, onClose }: InvestmentHistoryModalProps) {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [returnTransactions, setReturnTransactions] = useState<ReturnTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchInvestments()
    }
  }, [isOpen])

  const fetchInvestments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/investments')
      if (response.ok) {
        const data = await response.json()
        setInvestments(data.investments || [])
        setReturnTransactions(data.return_transactions || [])
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching investments:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  // Lấy transactions liên quan đến một investment
  const getReturnTransactionsForInvestment = (investment: Investment): ReturnTransaction[] => {
    if (investment.status !== 'completed') return []
    
    // Match transactions dựa trên:
    // 1. Amount chính xác (hoàn gốc = investment.amount)
    // 2. Hoặc amount = total_profit (hoàn hoa hồng)
    // 3. Và thời gian transaction phải sau khi investment completed (sau maturity_date)
    const maturityTime = investment.maturity_date ? new Date(investment.maturity_date).getTime() : 0
    
    return returnTransactions.filter((t) => {
      const transactionTime = new Date(t.created_at).getTime()
      const isAfterMaturity = maturityTime > 0 ? transactionTime >= maturityTime - 86400000 : true // Cho phép 1 ngày sai số
      
      const isPrincipalReturn = 
        t.description.includes('Hoàn gốc đầu tư') && 
        Math.abs(t.amount - investment.amount) < 0.01 // So sánh số tiền với sai số nhỏ
      
      const isProfitReturn = 
        t.description.includes('Hoàn hoa hồng đầu tư') && 
        investment.total_profit > 0 &&
        Math.abs(t.amount - investment.total_profit) < 0.01 // So sánh số tiền với sai số nhỏ
      
      return (isPrincipalReturn || isProfitReturn) && isAfterMaturity
    }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    // Date from database
    const date = new Date(dateString)
    // Format với timezone Việt Nam
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
    // Kiểm tra thời gian đáo hạn để hiển thị chính xác
    const isExpired = maturityDate && new Date(maturityDate) <= new Date();
    
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header - Compact */}
        <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 p-3 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📈</span>
              <h2 className="text-lg font-bold">Lịch sử đầu tư</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <span className="text-lg">✕</span>
            </button>
          </div>
        </div>

        {/* Content - Compact */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <p className="mt-2 text-gray-600">Đang tải...</p>
            </div>
          ) : investments.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">📊</span>
              <p className="text-gray-600 text-lg">Chưa có khoản đầu tư nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {investments.map((investment) => (
                <div
                  key={investment.id}
                  className="border border-gray-200 rounded-lg p-2 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(investment.amount)}
                        </span>
                        {getStatusBadge(investment.status, investment.maturity_date)}
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">Lãi:</span> {investment.daily_profit_rate}%/ngày
                        </div>
                        <div>
                          <span className="font-medium">Ngày:</span> {investment.investment_days}d
                        </div>
                        {investment.total_profit > 0 && (
                          <div>
                            <span className="font-medium">LN:</span>{' '}
                            <span className="text-green-600 font-bold">
                              {formatCurrency(investment.total_profit)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-1.5 mt-1.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span>Bắt đầu:</span>
                      <span className="font-medium">{formatDate(investment.created_at)}</span>
                    </div>
                    {investment.maturity_date && (
                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                        <span>Đáo hạn:</span>
                        <span className="font-medium">{formatDate(investment.maturity_date)}</span>
                      </div>
                    )}
                    {investment.status === 'active' && investment.maturity_date && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                        <span className="text-[10px] font-semibold text-gray-700">Còn lại:</span>
                        <CountdownTimer targetDate={investment.maturity_date} />
                      </div>
                    )}
                    
                    {/* Hiển thị thông tin hoàn trả cho investment đã hoàn thành - Compact */}
                    {investment.status === 'completed' && (
                      <div className="pt-1.5 border-t border-gray-200 mt-1.5">
                        <div className="text-[10px] font-semibold text-gray-700 mb-1">Hoàn trả:</div>
                        {(() => {
                          const returns = getReturnTransactionsForInvestment(investment)
                          const principalReturn = returns.find(t => t.description.includes('Hoàn gốc đầu tư'))
                          const profitReturn = returns.find(t => t.description.includes('Hoàn hoa hồng đầu tư'))
                          
                          // Luôn hiển thị cả gốc và hoa hồng
                          return (
                            <div className="space-y-0.5 text-[10px]">
                              {/* Hiển thị tiền gốc hoàn lại */}
                              <div className="flex items-center justify-between text-gray-600">
                                <span>Gốc:</span>
                                <div className="text-right">
                                  <span className="font-semibold text-blue-600">
                                    {principalReturn 
                                      ? formatCurrency(principalReturn.amount)
                                      : formatCurrency(investment.amount)
                                    }
                                  </span>
                                  {principalReturn && (
                                    <div className="text-[9px] text-gray-400">
                                      {new Date(principalReturn.created_at).toLocaleDateString('vi-VN')}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Hiển thị hoa hồng hoàn lại */}
                              <div className="flex items-center justify-between text-gray-600">
                                <span>Hoa hồng:</span>
                                <div className="text-right">
                                  <span className="font-semibold text-green-600">
                                    {(() => {
                                      // Ưu tiên hiển thị từ transaction nếu có
                                      if (profitReturn) {
                                        return formatCurrency(profitReturn.amount);
                                      }
                                      // Nếu không có transaction, tính lại từ investment data
                                      if (investment.total_profit && investment.total_profit > 0) {
                                        return formatCurrency(investment.total_profit);
                                      }
                                      // Nếu total_profit = 0 nhưng đầu tư đã completed, tính lại
                                      if (investment.status === 'completed' && investment.amount && investment.daily_profit_rate && investment.investment_days) {
                                        const calculatedProfit = investment.amount * (investment.daily_profit_rate / 100) * investment.investment_days;
                                        if (calculatedProfit > 0) {
                                          return formatCurrency(calculatedProfit);
                                        }
                                      }
                                      return formatCurrency(0);
                                    })()}
                                  </span>
                                  {profitReturn && (
                                    <div className="text-[9px] text-gray-400">
                                      {new Date(profitReturn.created_at).toLocaleDateString('vi-VN')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Compact */}
        <div className="border-t border-gray-200 p-2 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-1.5 px-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold rounded hover:from-orange-600 hover:to-red-600 transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

