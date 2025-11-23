'use client'

import { useState, useEffect, useCallback } from 'react'

interface BankAccount {
  id: number
  user_id: number
  user_name: string
  user_email: string
  bank_name: string
  account_number: string
  account_holder_name: string
  branch?: string
  created_at: string
  updated_at: string
}

export default function BankAccountsPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    branch: '',
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchBankAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/bank-accounts')
      if (response.ok) {
        const data = await response.json()
        setBankAccounts(data.bank_accounts || [])
      } else {
        setMessage({ type: 'error', text: 'Lỗi khi tải danh sách tài khoản ngân hàng' })
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi tải danh sách tài khoản ngân hàng' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBankAccounts()
  }, [fetchBankAccounts])

  const handleEdit = (account: BankAccount) => {
    setEditingId(account.id)
    setFormData({
      bank_name: account.bank_name,
      account_number: account.account_number,
      account_holder_name: account.account_holder_name,
      branch: account.branch || '',
    })
    setMessage(null)
  }

  const handleCancel = () => {
    setEditingId(null)
    setFormData({
      bank_name: '',
      account_number: '',
      account_holder_name: '',
      branch: '',
    })
    setMessage(null)
  }

  const handleSubmit = async (userId: number) => {
    setMessage(null)

    try {
      const response = await fetch('/api/admin/bank-accounts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          ...formData,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Cập nhật thông tin ngân hàng thành công!' })
        setEditingId(null)
        fetchBankAccounts()
      } else {
        setMessage({ type: 'error', text: data.error || 'Cập nhật thất bại' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Có lỗi xảy ra. Vui lòng thử lại.' })
    }
  }

  if (loading && bankAccounts.length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-sm shadow-sm p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#ee4d2d]">Quản lý thông tin ngân hàng</h1>
          </div>

          {message && (
            <div
              className={`mb-4 py-3 px-4 rounded-sm ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-600'
                  : 'bg-red-50 border border-red-200 text-red-600'
              }`}
            >
              {message.text}
            </div>
          )}

          {bankAccounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Chưa có thông tin ngân hàng nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ngân hàng</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Số TK</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Chủ TK</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Chi nhánh</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {bankAccounts.map((account) => (
                    <tr key={account.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium text-gray-800">{account.user_name}</div>
                          <div className="text-gray-500 text-xs">{account.user_email}</div>
                        </div>
                      </td>
                      {editingId === account.id ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={formData.bank_name}
                              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                              className="w-full h-9 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                              style={{ fontSize: '16px' }}
                              placeholder="Tên ngân hàng"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={formData.account_number}
                              onChange={(e) => setFormData({ ...formData, account_number: e.target.value.replace(/\D/g, '') })}
                              className="w-full h-9 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                              style={{ fontSize: '16px' }}
                              placeholder="Số tài khoản"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={formData.account_holder_name}
                              onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                              className="w-full h-9 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                              style={{ fontSize: '16px' }}
                              placeholder="Tên chủ TK"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={formData.branch}
                              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                              className="w-full h-9 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                              style={{ fontSize: '16px' }}
                              placeholder="Chi nhánh"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSubmit(account.user_id)}
                                className="px-3 py-1 bg-[#ee4d2d] text-white text-xs rounded hover:bg-[#f05d40] transition-colors"
                              >
                                Lưu
                              </button>
                              <button
                                onClick={handleCancel}
                                className="px-3 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500 transition-colors"
                              >
                                Hủy
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm text-gray-800">{account.bank_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-800 font-mono">{account.account_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-800">{account.account_holder_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{account.branch || '-'}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleEdit(account)}
                              className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                            >
                              Sửa
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

