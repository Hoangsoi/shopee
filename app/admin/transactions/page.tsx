'use client'

import { useState, useEffect, useCallback } from 'react'

interface Transaction {
  id: number
  user_id: number
  user_name: string
  user_email: string
  type: 'deposit' | 'withdraw'
  amount: number
  status: string
  description?: string
  bank_name?: string
  account_number?: string
  account_holder_name?: string
  created_at: string
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      let url = '/api/admin/transactions'
      const params = new URLSearchParams()
      if (filterStatus) params.append('status', filterStatus)
      if (filterType) params.append('type', filterType)
      if (params.toString()) url += '?' + params.toString()

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
      } else {
        setMessage({ type: 'error', text: 'Lỗi khi tải danh sách giao dịch' })
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi tải danh sách giao dịch' })
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterType])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const handleApprove = async (transactionId: number) => {
    if (!confirm('Xác nhận duyệt giao dịch này?')) {
      return
    }

    setProcessingId(transactionId)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/transactions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          status: 'completed',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Duyệt giao dịch thành công!' })
        fetchTransactions()
      } else {
        setMessage({ type: 'error', text: data.error || 'Duyệt giao dịch thất bại' })
      }
    } catch (error) {
      console.error('Error approving transaction:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi duyệt giao dịch' })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (transactionId: number) => {
    if (!confirm('Xác nhận từ chối giao dịch này? Tiền sẽ được hoàn lại vào ví (nếu là rút tiền).')) {
      return
    }

    setProcessingId(transactionId)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/transactions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          status: 'failed',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Từ chối giao dịch thành công!' })
        fetchTransactions()
      } else {
        setMessage({ type: 'error', text: data.error || 'Từ chối giao dịch thất bại' })
      }
    } catch (error) {
      console.error('Error rejecting transaction:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi từ chối giao dịch' })
    } finally {
      setProcessingId(null)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  const getStatusLabel = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      pending: 'Chờ duyệt',
      completed: 'Hoàn thành',
      failed: 'Thất bại',
      cancelled: 'Đã hủy',
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string): string => {
    const colorMap: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-[#ee4d2d]">Quản lý giao dịch</h1>
          </div>

          {/* Filters */}
          <div className="mb-4 flex gap-2 flex-wrap">
            <button
              onClick={() => {
                setFilterStatus('')
                setFilterType('')
              }}
              className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                filterStatus === '' && filterType === ''
                  ? 'bg-[#ee4d2d] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                filterStatus === 'pending'
                  ? 'bg-[#ee4d2d] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Chờ duyệt
            </button>
            <button
              onClick={() => setFilterType('withdraw')}
              className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                filterType === 'withdraw'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Rút tiền
            </button>
            <button
              onClick={() => setFilterType('deposit')}
              className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                filterType === 'deposit'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Nạp tiền
            </button>
          </div>

          {message && (
            <div
              className={`py-3 px-4 rounded-sm mb-4 ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-600'
                  : 'bg-red-50 border border-red-200 text-red-600'
              }`}
            >
              {message.text}
            </div>
          )}

          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              Chưa có giao dịch nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">ID</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Khách hàng</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Loại</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Số tiền</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Trạng thái</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Ngân hàng</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Ngày</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b text-sm text-gray-800">{transaction.id}</td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        <p className="font-medium">{transaction.user_name}</p>
                        <p className="text-xs text-gray-500">{transaction.user_email}</p>
                      </td>
                      <td className="py-2 px-4 border-b text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.type === 'deposit' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {transaction.type === 'deposit' ? 'Nạp' : 'Rút'}
                        </span>
                      </td>
                      <td className="py-2 px-4 border-b text-sm font-bold text-[#ee4d2d]">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="py-2 px-4 border-b text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                          {getStatusLabel(transaction.status)}
                        </span>
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-600">
                        {transaction.bank_name ? (
                          <div>
                            <p className="text-xs font-semibold text-gray-900 mb-1">
                              {transaction.account_holder_name || transaction.user_name}
                            </p>
                            <p className="text-xs font-medium text-gray-700">
                              {transaction.bank_name}
                            </p>
                            {transaction.account_number && (
                              <p className="text-xs text-gray-600 font-mono">
                                {transaction.account_number}
                              </p>
                            )}
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-600">
                        {new Date(transaction.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2 px-4 border-b text-sm">
                        {transaction.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(transaction.id)}
                              disabled={processingId === transaction.id}
                              className="px-3 py-1 bg-green-500 text-white rounded-sm hover:bg-green-600 transition-colors text-xs disabled:opacity-50"
                            >
                              {processingId === transaction.id ? 'Đang xử lý...' : 'Duyệt'}
                            </button>
                            <button
                              onClick={() => handleReject(transaction.id)}
                              disabled={processingId === transaction.id}
                              className="px-3 py-1 bg-red-500 text-white rounded-sm hover:bg-red-600 transition-colors text-xs disabled:opacity-50"
                            >
                              Từ chối
                            </button>
                          </div>
                        )}
                        {transaction.status !== 'pending' && (
                          <span className="text-gray-400 text-xs">Đã xử lý</span>
                        )}
                      </td>
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

