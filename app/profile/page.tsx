'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNavigation from '@/components/BottomNavigation'
import WithdrawModal from '@/components/WithdrawModal'
import WithdrawAmountModal from '@/components/WithdrawAmountModal'

interface User {
  id: number
  email: string
  name: string
  phone?: string | null
  agent_code?: string | null
  wallet_balance: number
  commission: number
  is_frozen?: boolean
}

interface BankAccount {
  id: number
  bank_name: string
  account_number: string
  account_holder_name: string
  branch?: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [showWithdrawAmountModal, setShowWithdrawAmountModal] = useState(false)
  const [hasBankAccount, setHasBankAccount] = useState(false)
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)

  useEffect(() => {
    fetchUser()
    checkBankAccount()
  }, [])

  const checkBankAccount = async () => {
    try {
      const response = await fetch('/api/bank-account')
      if (response.ok) {
        const data = await response.json()
        setHasBankAccount(data.bank_account !== null)
        setBankAccount(data.bank_account)
      }
    } catch (error) {
      console.error('Error checking bank account:', error)
    }
  }

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const handleWithdraw = async () => {
    // Kiểm tra tài khoản có bị đóng băng không
    if (user?.is_frozen) {
      alert('Tài khoản của bạn đã bị đóng băng. Không thể thực hiện rút tiền. Vui lòng liên hệ admin để được hỗ trợ.')
      return
    }

    // Kiểm tra xem đã có thông tin ngân hàng chưa
    try {
      const response = await fetch('/api/bank-account')
      if (response.ok) {
        const data = await response.json()
        if (data.bank_account) {
          // Đã có thông tin ngân hàng, mở modal rút tiền
          setHasBankAccount(true)
          setShowWithdrawAmountModal(true)
        } else {
          // Chưa có, mở modal nhập thông tin ngân hàng
          setHasBankAccount(false)
          setShowWithdrawModal(true)
        }
      }
    } catch (error) {
      console.error('Error checking bank account:', error)
      setShowWithdrawModal(true)
    }
  }

  const handleWithdrawSuccess = () => {
    // Refresh trang sau khi lưu thành công
    fetchUser()
    checkBankAccount()
  }

  const handleDepositClick = () => {
    // Điều hướng đến CSKH để nạp tiền
    router.push('/support')
  }


  // Hàm ẩn số điện thoại: chỉ hiển thị 3 số cuối
  const maskPhone = (phone: string | null | undefined): string => {
    if (!phone) return 'Chưa cập nhật'
    if (phone.length <= 3) return phone
    const lastThree = phone.slice(-3)
    const masked = '*'.repeat(phone.length - 3)
    return `${masked}${lastThree}`
  }

  // Format số tiền
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-20">
      <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 md:mb-4">Của tôi</h1>
        
        {/* Thông báo tài khoản bị đóng băng */}
        {user.is_frozen && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">🔒</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Tài khoản của bạn đã bị đóng băng
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    Tài khoản của bạn hiện đang bị đóng băng. Bạn vẫn có thể đăng nhập và xem thông tin, 
                    nhưng không thể mua hàng hoặc rút tiền. Vui lòng liên hệ admin để được hỗ trợ.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Thông tin tài khoản và tài chính trong cùng 1 khung */}
        <div className="bg-white rounded-lg p-4 md:p-6 mb-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Cột trái - Thông tin tài khoản */}
            <div className="border-b md:border-b-0 md:border-r border-gray-200 pb-4 md:pb-0 md:pr-6">
              <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4 pb-2 md:pb-3 border-b border-gray-200">
                Thông tin tài khoản
              </h2>
              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className="text-xs md:text-sm text-gray-500 block mb-1">Tên</label>
                  <p className="text-gray-800 font-medium text-base md:text-lg">{user.name || 'Chưa cập nhật'}</p>
                </div>
                <div>
                  <label className="text-xs md:text-sm text-gray-500 block mb-1">Email</label>
                  <p className="text-gray-800 font-medium text-base md:text-lg break-words">{user.email}</p>
                </div>
                <div>
                  <label className="text-xs md:text-sm text-gray-500 block mb-1">Số điện thoại</label>
                  <p className="text-gray-800 font-medium text-base md:text-lg">{maskPhone(user.phone)}</p>
                </div>
              </div>
            </div>

            {/* Cột giữa - Thông tin ngân hàng */}
            <div className="border-b md:border-b-0 md:border-r border-gray-200 pb-4 md:pb-0 md:pr-6 md:pl-6">
              <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4 pb-2 md:pb-3 border-b border-gray-200">
                Thông tin ngân hàng
              </h2>
              {bankAccount ? (
                <div className="space-y-3 md:space-y-4">
                  <div>
                    <label className="text-xs md:text-sm text-gray-500 block mb-1">Ngân hàng</label>
                    <p className="text-gray-800 font-medium text-base md:text-lg">{bankAccount.bank_name}</p>
                  </div>
                  <div>
                    <label className="text-xs md:text-sm text-gray-500 block mb-1">Số tài khoản</label>
                    <p className="text-gray-800 font-medium text-base md:text-lg">{bankAccount.account_number}</p>
                  </div>
                  <div>
                    <label className="text-xs md:text-sm text-gray-500 block mb-1">Chủ tài khoản</label>
                    <p className="text-gray-800 font-medium text-base md:text-lg">{bankAccount.account_holder_name}</p>
                  </div>
                  {bankAccount.branch && (
                    <div>
                      <label className="text-xs md:text-sm text-gray-500 block mb-1">Chi nhánh</label>
                      <p className="text-gray-800 font-medium text-base md:text-lg">{bankAccount.branch}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">Chưa có thông tin ngân hàng</p>
                  <p className="text-xs text-gray-400 mt-2">Thông tin sẽ được lưu khi bạn rút tiền lần đầu</p>
                </div>
              )}
            </div>

            {/* Cột phải - Thông tin tài chính */}
            <div className="pt-4 md:pt-0 md:pl-6">
              <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4 pb-2 md:pb-3 border-b border-gray-200">
                Thông tin tài chính
              </h2>
              <div className="space-y-3 md:space-y-4">
                <div className="p-3 md:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <label className="text-xs md:text-sm text-gray-600 block mb-2">Số dư ví</label>
                  <p className="text-xl md:text-2xl font-bold text-[#ee4d2d] mb-3">
                    {formatCurrency(user.wallet_balance || 0)}
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleDepositClick}
                      className="flex-1 py-2 px-3 bg-[#ee4d2d] text-white text-xs md:text-sm font-medium rounded hover:bg-[#f05d40] active:bg-[#d43d20] transition-colors"
                    >
                      Nạp
                    </button>
                    <button 
                      onClick={handleWithdraw}
                      className="flex-1 py-2 px-3 bg-gray-600 text-white text-xs md:text-sm font-medium rounded hover:bg-gray-700 active:bg-gray-800 transition-colors"
                    >
                      Rút
                    </button>
                  </div>
                </div>
                <div className="p-3 md:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <label className="text-xs md:text-sm text-gray-600 block mb-2">Hoa hồng</label>
                  <p className="text-xl md:text-2xl font-bold text-green-600">
                    {formatCurrency(user.commission || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full py-3 md:py-3 bg-[#ee4d2d] text-white rounded-lg text-sm md:text-base font-medium hover:bg-[#f05d40] active:bg-[#d43d20] transition-colors"
        >
          Đăng xuất
        </button>
      </div>
      
      {/* Modal nhập thông tin ngân hàng */}
      <WithdrawModal
        isOpen={showWithdrawModal && !hasBankAccount}
        onClose={() => setShowWithdrawModal(false)}
        onSuccess={() => {
          handleWithdrawSuccess()
          // Sau khi lưu thông tin ngân hàng, mở modal rút tiền
          setShowWithdrawModal(false)
          setShowWithdrawAmountModal(true)
        }}
      />

      {/* Modal rút tiền */}
      <WithdrawAmountModal
        isOpen={showWithdrawAmountModal}
        onClose={() => setShowWithdrawAmountModal(false)}
        onSuccess={handleWithdrawSuccess}
        walletBalance={user.wallet_balance || 0}
      />
      
      <BottomNavigation />
    </div>
  )
}
