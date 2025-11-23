'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import BottomNavigation from '@/components/BottomNavigation'
import Link from 'next/link'

interface Transaction {
  id: number
  type: 'deposit' | 'withdraw'
  amount: number
  status: string
  description?: string
  bank_name?: string
  account_number?: string
  created_at: string
}

export default function HistoryPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch('/api/transactions')
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
      } else if (response.status === 401) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] pb-20 flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-blue-50 pb-24">
      <div className="container mx-auto px-4 py-4 max-w-4xl">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-2xl shadow-xl mb-6 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💰</span>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Lịch sử giao dịch</h1>
                <p className="text-white/90 text-sm mt-1">{transactions.length} giao dịch</p>
              </div>
            </div>
            <Link 
              href="/profile" 
              className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/30 transition-all text-sm md:text-base flex items-center gap-2"
            >
              <span>💳</span>
              <span className="hidden md:inline">Quản lý tài chính</span>
            </Link>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
            <div className="text-6xl mb-4">💰</div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Chưa có giao dịch</h2>
            <p className="text-sm md:text-base text-gray-600 mb-6">Bắt đầu nạp hoặc rút tiền để xem lịch sử giao dịch</p>
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm md:text-base"
            >
              <span>💳</span>
              <span>Nạp/Rút tiền</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
              >
                <div className="p-4 md:p-6">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center flex-shrink-0 text-xl md:text-2xl shadow-md ${
                        transaction.type === 'deposit' 
                          ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white' 
                          : 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white'
                      }`}>
                        {transaction.type === 'deposit' ? '➕' : '➖'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 text-base md:text-lg mb-1">
                          {transaction.type === 'deposit' ? 'Nạp tiền' : 'Rút tiền'}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-500 flex items-center gap-1">
                          <span>🕐</span>
                          <span>
                            {new Date(transaction.created_at).toLocaleString('vi-VN', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-bold flex-shrink-0 ml-3 ${getStatusColor(transaction.status)} shadow-sm`}>
                      {getStatusLabel(transaction.status)}
                    </span>
                  </div>

                  {/* Content Row */}
                  <div className="pt-4 border-t border-gray-100">
                    {transaction.description && (
                      <div className="mb-3">
                        <p className="text-sm md:text-base text-gray-700 font-medium">
                          {transaction.description}
                        </p>
                      </div>
                    )}
                    {transaction.bank_name && (
                      <div className="flex items-center gap-2 mb-3 text-xs md:text-sm text-gray-600">
                        <span>🏦</span>
                        <span>
                          {transaction.bank_name}
                          {transaction.account_number && (
                            <> - ****{transaction.account_number.slice(-2)}</>
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="text-xs md:text-sm text-gray-500">
                        {transaction.type === 'deposit' ? 'Số tiền nạp' : 'Số tiền rút'}
                      </div>
                      <span className={`text-xl md:text-2xl font-bold ${
                        transaction.type === 'deposit' ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNavigation />
    </div>
  )
}
