'use client'

import { useState } from 'react'

interface InvestmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  walletBalance: number
  dailyProfitRate: number
}

export default function InvestmentModal({
  isOpen,
  onClose,
  onSuccess,
  walletBalance,
  dailyProfitRate,
}: InvestmentModalProps) {
  const [amount, setAmount] = useState('')
  const [investmentDays, setInvestmentDays] = useState('1')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('vi-VN').format(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const amountNum = parseFloat(amount.replace(/[^0-9]/g, ''))
    const daysNum = parseInt(investmentDays) || 1

    if (isNaN(amountNum) || amountNum <= 0) {
      setMessage({ type: 'error', text: 'Vui lòng nhập số tiền hợp lệ' })
      return
    }

    if (amountNum > walletBalance) {
      setMessage({ type: 'error', text: 'Số dư ví không đủ' })
      return
    }

    if (amountNum < 10000) {
      setMessage({ type: 'error', text: 'Số tiền đầu tư tối thiểu là 10,000 VND' })
      return
    }

    if (daysNum < 1 || daysNum > 365) {
      setMessage({ type: 'error', text: 'Số ngày đầu tư phải từ 1 đến 365 ngày' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          amount: amountNum,
          investment_days: daysNum
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Đầu tư thành công!' })
        setTimeout(() => {
          onSuccess()
          onClose()
          setAmount('')
          setInvestmentDays('1')
          setMessage(null)
        }, 1500)
      } else {
        setMessage({ type: 'error', text: data.error || 'Đầu tư thất bại' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Có lỗi xảy ra. Vui lòng thử lại.' })
    } finally {
      setLoading(false)
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Lấy giá trị raw từ input, loại bỏ dấu phẩy và ký tự không phải số
    const rawValue = e.target.value.replace(/[^0-9]/g, '')
    setAmount(rawValue)
  }

  const amountNum = parseFloat(amount.replace(/[^0-9]/g, '')) || 0
  const daysNum = parseInt(investmentDays) || 1
  const dailyProfit = amountNum * (dailyProfitRate / 100)
  const totalProfit = dailyProfit * daysNum
  const totalReturn = amountNum + totalProfit

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#ee4d2d]">Đầu tư</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {message && (
            <div
              className={`py-3 px-4 rounded-lg mb-4 ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-600'
                  : 'bg-red-50 border border-red-200 text-red-600'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số tiền đầu tư (VND)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={handleAmountChange}
                placeholder="Nhập số tiền (ví dụ: 1000000)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#ee4d2d] text-gray-900 text-lg"
                style={{ fontSize: '16px' }}
                required
              />
              {amount && (
                <p className="text-xs text-gray-600 mt-1">
                  Số tiền: <span className="font-semibold">{formatCurrency(parseFloat(amount) || 0)} VND</span>
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Số dư hiện tại: <span className="font-semibold">{formatCurrency(walletBalance)} VND</span>
              </p>
              <p className="text-xs text-gray-500">
                Tối thiểu: <span className="font-semibold">10,000 VND</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số ngày đầu tư
              </label>
              <input
                type="number"
                value={investmentDays}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '')
                  if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 365)) {
                    setInvestmentDays(value)
                  }
                }}
                min="1"
                max="365"
                placeholder="Nhập số ngày (1-365)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#ee4d2d] text-gray-900 text-lg"
                style={{ fontSize: '16px' }}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Số ngày đầu tư từ 1 đến 365 ngày
              </p>
            </div>

            {amountNum > 0 && daysNum > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Dự kiến lợi nhuận</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tỷ lệ lợi nhuận:</span>
                    <span className="text-sm font-bold text-[#ee4d2d]">{dailyProfitRate}%/ngày</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Số ngày đầu tư:</span>
                    <span className="text-sm font-bold text-gray-800">{daysNum} ngày</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Lợi nhuận/ngày:</span>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(dailyProfit)} VND
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-blue-200 pt-2 mt-2">
                    <span className="text-sm font-semibold text-gray-700">Tổng lợi nhuận ({daysNum} ngày):</span>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(totalProfit)} VND
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-blue-300 pt-2 mt-2">
                    <span className="text-base font-bold text-gray-800">Tổng nhận được:</span>
                    <span className="text-base font-bold text-[#ee4d2d]">
                      {formatCurrency(totalReturn)} VND
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-blue-200">
                    ⏰ Tiền gốc và lãi sẽ được hoàn lại vào ví sau {daysNum} ngày (10:00 sáng)
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading || amountNum <= 0 || daysNum < 1}
                className="flex-1 px-4 py-3 bg-[#ee4d2d] text-white rounded-lg hover:bg-[#f05d40] transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? 'Đang xử lý...' : 'Đầu tư'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

