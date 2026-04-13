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
    // Parallel fetch để tăng tốc độ
    Promise.all([
      fetchUser(),
      checkBankAccount(),
      fetchInvestments(),
      fetchInvestmentRate(),
    ]).catch((error) => {
      console.error('Error loading profile data:', error)
    })
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
      // Thêm cache-busting để đảm bảo luôn lấy dữ liệu mới nhất
      const response = await fetch('/api/settings/investment-rate')
      if (response.ok) {
        const data = await response.json()
        if (data.rates && Array.isArray(data.rates) && data.rates.length > 0) {
          setInvestmentRates(data.rates)
        }
      }
    } catch (error) {
      // Sử dụng giá trị mặc định nếu có lỗi
      console.error('Error fetching investment rates:', error)
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
        {/* Header Section với Avatar - Tinh gọn */}
        <div className="bg-gradient-to-r from-[#ee4d2d] via-[#ff6b4a] to-[#ee4d2d] rounded-xl shadow-lg mb-5 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="relative p-5">
            <div className="flex items-center gap-4">
              {/* Avatar Circle */}
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-xl font-bold text-[#ee4d2d] shadow-lg ring-2 ring-white/80">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                {user.is_frozen && (
                  <div className="absolute -bottom-0.5 -right-0.5 bg-red-500 rounded-full p-1 shadow-md">
                    <span className="text-white text-[10px]">🔒</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-white mb-0.5 truncate">{user.name || 'Người dùng'}</h1>
                <p className="text-white/90 text-xs break-words truncate">{user.email}</p>
                {user.vip_level !== undefined && user.vip_level !== null && user.vip_level > 0 && (
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-white shadow-md">
                      ⭐ VIP {user.vip_level}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Thông báo tài khoản bị đóng băng - Compact */}
        {user.is_frozen && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-3 mb-5 rounded-lg shadow-sm">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 text-lg">🔒</div>
              <div className="flex-1">
                <h3 className="text-xs font-semibold text-red-800 mb-0.5">
                  Tài khoản đã bị đóng băng
                </h3>
                <p className="text-xs text-red-700 leading-relaxed">
                  Không thể mua hàng hoặc rút tiền. Vui lòng liên hệ admin.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Card Số dư ví - Tinh gọn và nổi bật */}
        <div className="bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-xl shadow-xl p-5 mb-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-10 -mb-10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                <h2 className="text-sm font-semibold">Số dư ví</h2>
              </div>
              {user.vip_level !== undefined && user.vip_level !== null && user.vip_level > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-gray-900 shadow-md">
                  ⭐ VIP {user.vip_level}
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                  Thường
                </span>
              )}
            </div>
            <p className="text-3xl font-bold mb-4 drop-shadow-lg">
              {formatCurrency(user.wallet_balance || 0)}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={handleDepositClick}
                className="py-2.5 px-2 bg-white text-[#ee4d2d] text-xs font-bold rounded-lg hover:bg-gray-100 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1"
              >
                <span className="text-sm">💳</span>
                <span>Nạp</span>
              </button>
              <button 
                onClick={handleInvestmentClick}
                className="py-2.5 px-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-lg hover:from-yellow-500 hover:to-orange-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1"
              >
                <span className="text-sm">📈</span>
                <span>Đầu tư</span>
              </button>
              <button 
                onClick={handleWithdraw}
                className="py-2.5 px-2 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-lg hover:bg-white/30 active:scale-95 transition-all border border-white/30 flex items-center justify-center gap-1"
              >
                <span className="text-sm">🏦</span>
                <span>Rút</span>
              </button>
            </div>
          </div>
        </div>

        {/* Menu Của tôi - Di chuyển lên trên */}
        <div className="bg-white rounded-2xl shadow-xl p-5 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-xl">🎫</span>
            </div>
            <h2 className="text-lg font-bold text-gray-800">Vé dự thưởng</h2>
          </div>
          <button
            onClick={() => router.push('/tickets')}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 hover:from-purple-100 hover:via-pink-100 hover:to-purple-100 rounded-xl transition-all border border-purple-200/50 active:scale-[0.98] shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎫</span>
              <span className="text-base font-semibold text-gray-800">Xem vé dự thưởng của tôi</span>
            </div>
            <span className="text-purple-500 text-xl">›</span>
          </button>
        </div>

        {/* Grid Layout cho các thông tin - Tinh gọn hơn */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Card Hoa hồng - Compact */}
          <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl shadow-lg p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎁</span>
                <h2 className="text-base font-bold">Hoa hồng</h2>
              </div>
            </div>
            <p className="text-2xl font-bold drop-shadow-lg">
              {formatCurrency(user.commission || 0)}
            </p>
          </div>

          {/* Card Đầu tư - Compact */}
          <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-xl shadow-lg p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📈</span>
                <h2 className="text-base font-bold">Đầu tư</h2>
              </div>
            </div>
            <p className="text-xl font-bold drop-shadow-lg mb-1">
              {formatCurrency(investmentSummary.total_invested || 0)}
            </p>
            {investmentSummary.total_profit > 0 && (
              <p className="text-sm opacity-90 mb-1">
                Lợi nhuận: <span className="font-bold">{formatCurrency(investmentSummary.total_profit)}</span>
              </p>
            )}
            {investmentSummary.active_count > 0 && (
              <p className="text-xs opacity-75 mb-2">
                {investmentSummary.active_count} khoản đang hoạt động
              </p>
            )}
            {investments.length > 0 && (() => {
              const activeInvestments = investments.filter((inv: any) => inv.status === 'active' && inv.maturity_date)
              if (activeInvestments.length > 0) {
                const sorted = [...activeInvestments].sort((a: any, b: any) => 
                  new Date(a.maturity_date).getTime() - new Date(b.maturity_date).getTime()
                )
                const earliestInvestment = sorted[0]
                return (
                  <div className="mt-2 pt-2 border-t border-white/20">
                    <p className="text-xs opacity-75 mb-1">Hoàn trả sớm nhất:</p>
                    <CountdownTimer targetDate={earliestInvestment.maturity_date} variant="light" />
                  </div>
                )
              }
              return null
            })()}
            <button
              onClick={() => setShowInvestmentHistoryModal(true)}
              className="mt-3 w-full py-2 px-3 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-all backdrop-blur-sm border border-white/30"
            >
              📋 Lịch sử
            </button>
          </div>
        </div>

        {/* Card Thông tin tài khoản & Ngân hàng - Tinh gọn */}
        <div className="bg-white rounded-xl shadow-lg p-5 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <span className="text-xl">👤</span>
            </div>
            <h2 className="text-lg font-bold text-gray-800">Thông tin tài khoản</h2>
          </div>
          
          {/* Thông tin tài khoản - Compact */}
          <div className="mb-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-xs text-gray-500 block mb-1">Tên</label>
                <p className="text-gray-800 font-semibold text-sm">{user.name || 'Chưa cập nhật'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-xs text-gray-500 block mb-1">Email</label>
                <p className="text-gray-800 font-semibold text-sm break-words">{user.email}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-xs text-gray-500 block mb-1">Số điện thoại</label>
                <p className="text-gray-800 font-semibold text-sm">{maskPhone(user.phone)}</p>
              </div>
              {user.agent_code && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <label className="text-xs text-gray-500 block mb-1">Mã đại lý</label>
                  <p className="text-gray-800 font-semibold text-sm">{user.agent_code}</p>
                </div>
              )}
            </div>
          </div>

          {/* Thông tin ngân hàng - Compact */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🏦</span>
              <h3 className="text-sm font-semibold text-gray-700">Thông tin ngân hàng</h3>
            </div>
            {bankAccount ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                  <label className="text-xs text-gray-600 block mb-1 font-medium">Ngân hàng</label>
                  <p className="text-gray-800 font-bold text-sm">{bankAccount.bank_name}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                  <label className="text-xs text-gray-600 block mb-1 font-medium">Số tài khoản</label>
                  <p className="text-gray-800 font-bold text-sm font-mono">{bankAccount.account_number}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                  <label className="text-xs text-gray-600 block mb-1 font-medium">Chủ tài khoản</label>
                  <p className="text-gray-800 font-bold text-sm">{bankAccount.account_holder_name}</p>
                </div>
                {bankAccount.branch && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                    <label className="text-xs text-gray-600 block mb-1 font-medium">Chi nhánh</label>
                    <p className="text-gray-800 font-bold text-sm">{bankAccount.branch}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-2xl mb-1 block">🏦</span>
                <p className="text-xs text-gray-600 font-medium">Chưa có thông tin ngân hàng</p>
                <p className="text-xs text-gray-400 mt-1">Sẽ được lưu khi rút tiền lần đầu</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Button Đăng xuất - Tinh gọn */}
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-sm font-bold shadow-md hover:from-red-600 hover:to-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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
