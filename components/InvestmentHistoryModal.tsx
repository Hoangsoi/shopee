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

interface InvestmentHistoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function InvestmentHistoryModal({ isOpen, onClose }: InvestmentHistoryModalProps) {
  const [investments, setInvestments] = useState<Investment[]>([])
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
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching investments:', error)
      }
    } finally {
      setLoading(false)
    }
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            Đang hoạt động
          </span>
        )
      case 'completed':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
            Đã hoàn thành
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📈</span>
              <h2 className="text-xl md:text-2xl font-bold">Lịch sử đầu tư</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <span className="text-2xl">✕</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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
            <div className="space-y-4">
              {investments.map((investment) => (
                <div
                  key={investment.id}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-bold text-gray-900">
                          {formatCurrency(investment.amount)}
                        </span>
                        {getStatusBadge(investment.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-semibold">Tỷ lệ lợi nhuận:</span>{' '}
                          {investment.daily_profit_rate}%/ngày
                        </div>
                        <div>
                          <span className="font-semibold">Số ngày:</span> {investment.investment_days} ngày
                        </div>
                        {investment.total_profit > 0 && (
                          <div className="col-span-2">
                            <span className="font-semibold">Lợi nhuận:</span>{' '}
                            <span className="text-green-600 font-bold">
                              {formatCurrency(investment.total_profit)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Ngày bắt đầu:</span>
                      <span className="font-medium">{formatDate(investment.created_at)}</span>
                    </div>
                    {investment.maturity_date && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Ngày đáo hạn:</span>
                        <span className="font-medium">{formatDate(investment.maturity_date)}</span>
                      </div>
                    )}
                    {investment.status === 'active' && investment.maturity_date && (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs font-semibold text-gray-700">Thời gian còn lại:</span>
                        <CountdownTimer targetDate={investment.maturity_date} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-lg"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

