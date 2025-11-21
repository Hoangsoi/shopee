'use client'

import { useState, useEffect } from 'react'

interface BankAccount {
  id: number
  bank_name: string
  account_number: string
  account_holder_name: string
  branch?: string
}

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function WithdrawModal({ isOpen, onClose, onSuccess }: WithdrawModalProps) {
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    branch: '',
  })

  useEffect(() => {
    if (isOpen) {
      fetchBankAccount()
    }
  }, [isOpen])

  const fetchBankAccount = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/bank-account')
      const data = await response.json()
      
      if (data.bank_account) {
        setBankAccount(data.bank_account)
      }
    } catch (error) {
      console.error('Error fetching bank account:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/bank-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess()
        onClose()
        // Sau khi lưu thông tin ngân hàng, mở modal rút tiền
        // (Có thể thêm callback để mở modal rút tiền)
      } else {
        setError(data.error || 'Có lỗi xảy ra')
      }
    } catch (error) {
      setError('Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="text-center">Đang tải...</div>
        </div>
      </div>
    )
  }

  // Nếu đã có thông tin ngân hàng, chỉ hiển thị (không cho chỉnh sửa)
  if (bankAccount) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Thông tin ngân hàng</h2>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm text-gray-500 block mb-1">Tên ngân hàng</label>
              <p className="text-gray-800 font-medium">{bankAccount.bank_name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">Số tài khoản</label>
              <p className="text-gray-800 font-medium">{bankAccount.account_number}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">Tên chủ tài khoản</label>
              <p className="text-gray-800 font-medium">{bankAccount.account_holder_name}</p>
            </div>
            {bankAccount.branch && (
              <div>
                <label className="text-sm text-gray-500 block mb-1">Chi nhánh</label>
                <p className="text-gray-800 font-medium">{bankAccount.branch}</p>
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">
              ⚠️ Bạn không thể thay đổi thông tin ngân hàng. Vui lòng liên hệ admin để thay đổi.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    )
  }

  // Nếu chưa có, hiển thị form nhập
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Nhập thông tin ngân hàng</h2>
        <p className="text-sm text-gray-600 mb-4">
          Vui lòng nhập thông tin ngân hàng để rút tiền. Thông tin này sẽ được lưu cố định và chỉ admin mới có thể thay đổi.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-700 block mb-1">Tên ngân hàng *</label>
            <input
              type="text"
              required
              className="w-full h-11 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              placeholder="VD: Vietcombank, Techcombank..."
            />
          </div>

          <div>
            <label className="text-sm text-gray-700 block mb-1">Số tài khoản *</label>
            <input
              type="text"
              required
              className="w-full h-11 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm"
              value={formData.account_number}
              onChange={(e) => setFormData({ ...formData, account_number: e.target.value.replace(/\D/g, '') })}
              placeholder="Nhập số tài khoản"
            />
          </div>

          <div>
            <label className="text-sm text-gray-700 block mb-1">Tên chủ tài khoản *</label>
            <input
              type="text"
              required
              className="w-full h-11 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm"
              value={formData.account_holder_name}
              onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
              placeholder="Nhập tên chủ tài khoản"
            />
          </div>

          <div>
            <label className="text-sm text-gray-700 block mb-1">Chi nhánh (tùy chọn)</label>
            <input
              type="text"
              className="w-full h-11 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              placeholder="Nhập chi nhánh"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm py-2 px-3 rounded-sm">
              {error}
            </div>
          )}

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
              {submitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

