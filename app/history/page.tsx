'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] pb-20 flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-20">
      <div className="container mx-auto px-3 py-2">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-lg font-bold text-gray-800">Lịch sử nạp/rút</h1>
          <Link href="/profile" className="text-xs text-[#ee4d2d] hover:underline">
            Quản lý tài chính
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">💰</div>
            <p className="text-sm text-gray-600 mb-3">Chưa có giao dịch nào</p>
            <Link
              href="/profile"
              className="inline-block px-4 py-2 bg-[#ee4d2d] text-white rounded text-sm font-medium hover:bg-[#f05d40] transition-colors"
            >
              Nạp/Rút tiền
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white rounded shadow-sm p-2"
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                      transaction.type === 'deposit' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {transaction.type === 'deposit' ? '➕' : '➖'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 text-sm">
                        {transaction.type === 'deposit' ? 'Nạp tiền' : 'Rút tiền'}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.created_at).toLocaleString('vi-VN', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ml-2 ${getStatusColor(transaction.status)}`}>
                    {getStatusLabel(transaction.status)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-600 min-w-0 flex-1">
                    {transaction.description && (
                      <div className="truncate">{transaction.description}</div>
                    )}
                    {transaction.bank_name && (
                      <div className="text-xs text-gray-500 truncate">
                        {transaction.bank_name}
                        {transaction.account_number && (
                          <> - {transaction.account_number.slice(-2)}</>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ml-2 ${
                    transaction.type === 'deposit' ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {transaction.type === 'deposit' ? '+' : '-'}{new Intl.NumberFormat('vi-VN').format(transaction.amount)}đ
                  </span>
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
