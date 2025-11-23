'use client'

import { useState } from 'react'

interface WithdrawAmountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  walletBalance: number
}

export default function WithdrawAmountModal({ isOpen, onClose, onSuccess, walletBalance }: WithdrawAmountModalProps) {
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const amountNum = parseFloat(amount.replace(/[^\d]/g, ''))
    
    if (!amountNum || amountNum <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ')
      return
    }

    if (amountNum > walletBalance) {
      setError('Số tiền rút không được vượt quá số dư ví')
      return
    }

    if (amountNum < 10000) {
      setError('Số tiền rút tối thiểu là 10.000đ')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
          body: JSON.stringify({
          type: 'withdraw',
          amount: amountNum,
          description: `Rút tiền ${formatCurrency(amountNum)}`,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess()
        onClose()
        setAmount('')
      } else {
        setError(data.error || 'Rút tiền thất bại')
      }
    } catch (error) {
      setError('Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Rút tiền</h2>
        
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Số dư ví hiện tại:</p>
          <p className="text-xl font-bold text-[#ee4d2d]">{formatCurrency(walletBalance)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-700 block mb-1">Số tiền rút *</label>
            <input
              type="text"
              inputMode="numeric"
              required
              autoComplete="off"
              className="w-full h-11 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm text-gray-900"
              style={{ fontSize: '16px' }}
              value={amount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d]/g, '')
                setAmount(value)
              }}
              placeholder="Nhập số tiền (VD: 100000)"
            />
            {amount && (
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(parseFloat(amount.replace(/[^\d]/g, '')) || 0)}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm py-2 px-3 rounded-sm">
              {error}
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              ⚠️ Yêu cầu rút tiền sẽ được gửi đến admin để duyệt. Tiền sẽ được chuyển vào tài khoản ngân hàng đã đăng ký.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-[#ee4d2d] text-white rounded-lg font-medium hover:bg-[#f05d40] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Đang xử lý...' : 'Xác nhận rút tiền'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

