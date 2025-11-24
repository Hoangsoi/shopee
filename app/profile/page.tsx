'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNavigation from '@/components/BottomNavigation'
import WithdrawModal from '@/components/WithdrawModal'
import WithdrawAmountModal from '@/components/WithdrawAmountModal'
import InvestmentModal from '@/components/InvestmentModal'
import InvestmentHistoryModal from '@/components/InvestmentHistoryModal'
import CountdownTimer from '@/components/CountdownTimer'

interface User {
  id: number
  email: string
  name: string
  phone?: string | null
  agent_code?: string | null
  wallet_balance: number
  commission: number
  is_frozen?: boolean
  vip_level?: number
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
  const [showInvestmentModal, setShowInvestmentModal] = useState(false)
  const [showInvestmentHistoryModal, setShowInvestmentHistoryModal] = useState(false)
  const [hasBankAccount, setHasBankAccount] = useState(false)
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [investments, setInvestments] = useState<any[]>([])
  const [investmentSummary, setInvestmentSummary] = useState({ total_invested: 0, total_profit: 0, active_count: 0 })
  const [investmentRates, setInvestmentRates] = useState<Array<{ min_days: number; max_days?: number; rate: number }>>([
    { min_days: 1, max_days: 6, rate: 1.00 },
    { min_days: 7, max_days: 14, rate: 2.00 },
    { min_days: 15, max_days: 29, rate: 3.00 },
    { min_days: 30, rate: 5.00 },
  ])

  useEffect(() => {
    fetchUser()
    checkBankAccount()
    fetchInvestments()
    fetchInvestmentRate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Reset Crisp session before logout to clear chat history
      if (typeof window !== 'undefined' && window.$crisp) {
        window.$crisp.push(['do', 'session:reset'])
        window.$crisp.push(['set', 'user:email', ''])
        window.$crisp.push(['set', 'user:nickname', ''])
        window.$crisp.push(['set', 'session:data', []])
        window.$crisp.push(['do', 'chat:hide'])
      }
      
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

  const fetchInvestments = async () => {
    try {
      const response = await fetch('/api/investments')
      if (response.ok) {
        const data = await response.json()
        setInvestments(data.investments || [])
        setInvestmentSummary(data.summary || { total_invested: 0, total_profit: 0, active_count: 0 })
      }
    } catch (error) {
      console.error('Error fetching investments:', error)
    }
  }

  const fetchInvestmentRate = async () => {
    try {
      const response = await fetch('/api/settings/investment-rate')
      if (response.ok) {
        const data = await response.json()
        if (data.rates && Array.isArray(data.rates) && data.rates.length > 0) {
          setInvestmentRates(data.rates)
        }
      }
    } catch (error) {
      // Sử dụng giá trị mặc định nếu có lỗi
    }
  }

  const handleInvestmentClick = () => {
    if (user?.is_frozen) {
      alert('Tài khoản của bạn đã bị đóng băng. Không thể đầu tư. Vui lòng liên hệ admin để được hỗ trợ.')
      return
    }
    setShowInvestmentModal(true)
  }

  const handleInvestmentSuccess = () => {
    fetchUser()
    fetchInvestments()
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 pb-24">
      <div className="container mx-auto px-4 py-4 max-w-6xl">
        {/* Header Section với Avatar */}
        <div className="bg-gradient-to-r from-[#ee4d2d] via-[#ff6b4a] to-[#ee4d2d] rounded-2xl shadow-xl mb-6 overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-4 md:gap-6">
              {/* Avatar Circle */}
              <div className="relative">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white flex items-center justify-center text-2xl md:text-3xl font-bold text-[#ee4d2d] shadow-lg ring-4 ring-white/50">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                {user.is_frozen && (
                  <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1.5 shadow-lg">
                    <span className="text-white text-xs">🔒</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-xl md:text-2xl font-bold text-white mb-1">{user.name || 'Người dùng'}</h1>
                <p className="text-white/90 text-sm md:text-base break-words">{user.email}</p>
                {user.vip_level !== undefined && user.vip_level !== null && user.vip_level > 0 && (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs md:text-sm font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-white shadow-lg animate-pulse">
                      ⭐ VIP {user.vip_level}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Thông báo tài khoản bị đóng băng */}
        {user.is_frozen && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-4 mb-6 rounded-xl shadow-md animate-pulse">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-2xl">🔒</div>
              <div className="flex-1">
                <h3 className="text-sm md:text-base font-semibold text-red-800 mb-1">
                  Tài khoản của bạn đã bị đóng băng
                </h3>
                <p className="text-xs md:text-sm text-red-700 leading-relaxed">
                  Tài khoản của bạn hiện đang bị đóng băng. Bạn vẫn có thể đăng nhập và xem thông tin, 
                  nhưng không thể mua hàng hoặc rút tiền. Vui lòng liên hệ admin để được hỗ trợ.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Card Số dư ví - Nổi bật */}
        <div className="bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-6 md:p-8 mb-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-full -ml-12 -mb-12"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl md:text-3xl">💰</span>
                <h2 className="text-base md:text-lg font-semibold">Số dư ví</h2>
              </div>
              {user.vip_level !== undefined && user.vip_level !== null && user.vip_level > 0 ? (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs md:text-sm font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-gray-900 shadow-lg">
                  Cấp độ ⭐ VIP {user.vip_level}
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold bg-white/20 text-white backdrop-blur-sm">
                  Cấp độ Thường
                </span>
              )}
            </div>
            <p className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 drop-shadow-lg">
              {formatCurrency(user.wallet_balance || 0)}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={handleDepositClick}
                className="py-3 px-3 bg-white text-[#ee4d2d] text-sm font-bold rounded-xl hover:bg-gray-100 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <span className="text-base">💳</span>
                <span>Nạp</span>
              </button>
              <button 
                onClick={handleInvestmentClick}
                className="py-3 px-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold rounded-xl hover:from-yellow-500 hover:to-orange-600 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <span className="text-base">📈</span>
                <span>Đầu tư</span>
              </button>
              <button 
                onClick={handleWithdraw}
                className="py-3 px-3 bg-white/20 backdrop-blur-sm text-white text-sm font-bold rounded-xl hover:bg-white/30 active:scale-95 transition-all border-2 border-white/30 flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <span className="text-base">🏦</span>
                <span>Rút</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grid Layout cho các thông tin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
          {/* Card Hoa hồng */}
          <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🎁</span>
              <h2 className="text-lg md:text-xl font-bold">Hoa hồng</h2>
            </div>
            <p className="text-2xl md:text-3xl font-bold drop-shadow-lg">
              {formatCurrency(user.commission || 0)}
            </p>
          </div>

          {/* Card Đầu tư */}
          <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📈</span>
              <h2 className="text-lg md:text-xl font-bold">Đầu tư</h2>
            </div>
            <p className="text-xl md:text-2xl font-bold drop-shadow-lg mb-2">
              {formatCurrency(investmentSummary.total_invested || 0)}
            </p>
            {investmentSummary.total_profit > 0 && (
              <p className="text-sm md:text-base opacity-90 mb-2">
                Lợi nhuận: <span className="font-bold">{formatCurrency(investmentSummary.total_profit)}</span>
              </p>
            )}
            {investmentSummary.active_count > 0 && (
              <>
                <p className="text-xs md:text-sm opacity-75 mb-2">
                  {investmentSummary.active_count} khoản đầu tư đang hoạt động
                </p>
                {/* Hiển thị đồng hồ đếm ngược cho đầu tư sớm nhất */}
                {investments.length > 0 && (() => {
                  const activeInvestments = investments.filter((inv: any) => inv.status === 'active' && inv.maturity_date)
                  if (activeInvestments.length > 0) {
                    // Sắp xếp theo maturity_date, lấy đầu tư sớm nhất
                    const sorted = [...activeInvestments].sort((a: any, b: any) => 
                      new Date(a.maturity_date).getTime() - new Date(b.maturity_date).getTime()
                    )
                    const earliestInvestment = sorted[0]
                    return (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <p className="text-xs opacity-75 mb-1">Thời gian hoàn trả sớm nhất:</p>
                        <CountdownTimer targetDate={earliestInvestment.maturity_date} variant="light" />
                      </div>
                    )
                  }
                  return null
                })()}
              </>
            )}
            {/* Nút xem lịch sử đầu tư */}
            <button
              onClick={() => setShowInvestmentHistoryModal(true)}
              className="mt-4 w-full py-2.5 px-4 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl transition-all backdrop-blur-sm border border-white/30 flex items-center justify-center gap-2"
            >
              <span>📋</span>
              <span>Lịch sử đầu tư</span>
            </button>
          </div>

          {/* Card Thông tin tài khoản */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
              <span className="text-2xl">👤</span>
              <h2 className="text-lg md:text-xl font-bold text-gray-800">Thông tin tài khoản</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-gray-400 text-sm w-20 flex-shrink-0">Tên:</span>
                <p className="text-gray-800 font-semibold flex-1">{user.name || 'Chưa cập nhật'}</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-400 text-sm w-20 flex-shrink-0">Email:</span>
                <p className="text-gray-800 font-semibold flex-1 break-words text-sm md:text-base">{user.email}</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-400 text-sm w-20 flex-shrink-0">SĐT:</span>
                <p className="text-gray-800 font-semibold flex-1">{maskPhone(user.phone)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card Thông tin ngân hàng */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
            <span className="text-2xl">🏦</span>
            <h2 className="text-lg md:text-xl font-bold text-gray-800">Thông tin ngân hàng</h2>
          </div>
          {bankAccount ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="text-xs text-gray-500 block mb-1">Ngân hàng</label>
                <p className="text-gray-800 font-semibold text-base md:text-lg">{bankAccount.bank_name}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="text-xs text-gray-500 block mb-1">Số tài khoản</label>
                <p className="text-gray-800 font-semibold text-base md:text-lg font-mono">{bankAccount.account_number}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="text-xs text-gray-500 block mb-1">Chủ tài khoản</label>
                <p className="text-gray-800 font-semibold text-base md:text-lg">{bankAccount.account_holder_name}</p>
              </div>
              {bankAccount.branch && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="text-xs text-gray-500 block mb-1">Chi nhánh</label>
                  <p className="text-gray-800 font-semibold text-base md:text-lg">{bankAccount.branch}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <span className="text-4xl mb-3 block">🏦</span>
              <p className="text-sm md:text-base text-gray-600 font-medium">Chưa có thông tin ngân hàng</p>
              <p className="text-xs text-gray-400 mt-2">Thông tin sẽ được lưu khi bạn rút tiền lần đầu</p>
            </div>
          )}
        </div>
        
        {/* Button Đăng xuất */}
        <button
          onClick={handleLogout}
          className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-base md:text-lg font-bold shadow-lg hover:from-red-600 hover:to-red-700 active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          <span>🚪</span>
          <span>Đăng xuất</span>
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

      {/* Modal đầu tư */}
      <InvestmentModal
        isOpen={showInvestmentModal}
        onClose={() => setShowInvestmentModal(false)}
        onSuccess={handleInvestmentSuccess}
        walletBalance={user.wallet_balance || 0}
        investmentRates={investmentRates}
      />

      {/* Modal lịch sử đầu tư */}
      <InvestmentHistoryModal
        isOpen={showInvestmentHistoryModal}
        onClose={() => setShowInvestmentHistoryModal(false)}
      />
      
      <BottomNavigation />
    </div>
  )
}
