'use client'

import { useEffect, useState } from 'react'
import BottomNavigation from '@/components/BottomNavigation'
import Script from 'next/script'

declare global {
  interface Window {
    $crisp?: any
    CRISP_WEBSITE_ID?: string
  }
}

interface User {
  id: number
  email: string
  name: string
  role: string
}

export default function SupportPage() {
  const [zaloLink, setZaloLink] = useState<string>('')
  const [zaloEnabled, setZaloEnabled] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [crispLoaded, setCrispLoaded] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetchZaloSettings()
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  useEffect(() => {
    // Initialize Crisp after script loads and user is loaded
    // This ensures each user gets their own separate chat session
    if (typeof window !== 'undefined' && window.$crisp && user) {
      // Reset session trước để đảm bảo session mới và xóa lịch sử chat của user trước
      window.$crisp.push(['do', 'session:reset'])
      
      // Set user data cho Crisp để tách biệt session theo user
      // Crisp sẽ tự động tạo session mới dựa trên user email
      if (user.email) {
        window.$crisp.push(['set', 'user:email', user.email])
      }
      if (user.name) {
        window.$crisp.push(['set', 'user:nickname', user.name])
      }
      // Set session data với user ID để đảm bảo tách biệt hoàn toàn
      window.$crisp.push(['set', 'session:data', [
        ['user_id', user.id.toString()],
        ['user_email', user.email],
        ['user_name', user.name || ''],
        ['user_role', user.role || 'user']
      ]])
      
      // Hide chat widget completely
      window.$crisp.push(['do', 'chat:hide'])
      
      if (!crispLoaded) {
        setCrispLoaded(true)
      }
    }
  }, [user, crispLoaded])

  const openCrispChat = () => {
    if (typeof window !== 'undefined' && window.$crisp && user) {
      // Đảm bảo user data được set trước khi mở chat
      window.$crisp.push(['set', 'user:email', user.email])
      if (user.name) {
        window.$crisp.push(['set', 'user:nickname', user.name])
      }
      window.$crisp.push(['set', 'session:data', [
        ['user_id', user.id.toString()],
        ['user_email', user.email],
        ['user_name', user.name || ''],
        ['user_role', user.role || 'user']
      ]])
      
      // Show and open chat
      window.$crisp.push(['do', 'chat:show'])
      window.$crisp.push(['do', 'chat:open'])
      
      // Listen for chat close event to hide it again
      window.$crisp.push(['on', 'chat:closed', () => {
        if (window.$crisp) {
          window.$crisp.push(['do', 'chat:hide'])
        }
      }])
    } else if (typeof window !== 'undefined' && !user) {
      // Nếu chưa đăng nhập, yêu cầu đăng nhập
      alert('Vui lòng đăng nhập để sử dụng tính năng chat')
    } else {
      // If Crisp not loaded yet, try to initialize
      if (typeof window !== 'undefined' && user) {
        window.$crisp = []
        window.CRISP_WEBSITE_ID = '28304a63-17fd-46d3-a249-4090ab8d41f2'
        const d = document
        const s = d.createElement('script')
        s.src = 'https://client.crisp.chat/l.js'
        s.async = true
        d.getElementsByTagName('head')[0].appendChild(s)
        
        // Wait a bit then set user data and open
        setTimeout(() => {
          if (window.$crisp && user) {
            // Reset session trước
            window.$crisp.push(['do', 'session:reset'])
            // Set user data
            window.$crisp.push(['set', 'user:email', user.email])
            if (user.name) {
              window.$crisp.push(['set', 'user:nickname', user.name])
            }
            window.$crisp.push(['set', 'session:data', [
              ['user_id', user.id.toString()],
              ['user_email', user.email],
              ['user_name', user.name || ''],
              ['user_role', user.role || 'user']
            ]])
            
            window.$crisp.push(['do', 'chat:show'])
            window.$crisp.push(['do', 'chat:open'])
            // Listen for chat close
            window.$crisp.push(['on', 'chat:closed', () => {
              if (window.$crisp) {
                window.$crisp.push(['do', 'chat:hide'])
              }
            }])
          }
        }, 500)
      }
    }
  }

  const fetchZaloSettings = async () => {
    try {
      // Thêm timestamp để tránh cache
      const response = await fetch(`/api/settings/zalo?t=${Date.now()}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Zalo settings:', data) // Debug log
        const linkValue = data.link || ''
        // Xử lý enabled: có thể là boolean hoặc string
        const isEnabled = data.enabled === true || data.enabled === 'true' || String(data.enabled).toLowerCase() === 'true'
        setZaloLink(linkValue)
        setZaloEnabled(isEnabled)
        console.log('Zalo enabled state:', isEnabled, 'link:', linkValue) // Debug log
      } else {
        console.error('Failed to fetch Zalo settings:', response.status)
      }
    } catch (error) {
      console.error('Error fetching Zalo settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleZaloChat = () => {
    if (zaloLink) {
      window.open(zaloLink, '_blank')
    }
  }

  return (
    <>
      <Script
        id="crisp-chat"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.$crisp=[];
            window.CRISP_WEBSITE_ID="28304a63-17fd-46d3-a249-4090ab8d41f2";
            (function(){
              d=document;
              s=d.createElement("script");
              s.src="https://client.crisp.chat/l.js";
              s.async=1;
              d.getElementsByTagName("head")[0].appendChild(s);
            })();
          `,
        }}
        onLoad={() => {
          if (typeof window !== 'undefined' && window.$crisp) {
            // Hide chat widget completely
            window.$crisp.push(['do', 'chat:hide'])
            // Listen for chat close to hide it again
            window.$crisp.push(['on', 'chat:closed', () => {
              if (window.$crisp) {
                window.$crisp.push(['do', 'chat:hide'])
              }
            }])
            setCrispLoaded(true)
          }
        }}
      />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 pb-24">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-[#ee4d2d] via-[#ff6b4a] to-[#ee4d2d] rounded-2xl shadow-xl mb-6 p-6 md:p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            <div className="relative z-10 text-center">
              <div className="text-5xl md:text-6xl mb-4">💬</div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Chăm sóc khách hàng</h1>
              <p className="text-white/90 text-sm md:text-base">Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7</p>
            </div>
          </div>

          {/* Nạp tiền Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-6 border border-gray-100">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full mb-4 shadow-lg">
                <span className="text-4xl md:text-5xl">💰</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3">Nạp tiền vào ví</h2>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-xl p-4 md:p-6 mb-6 max-w-2xl mx-auto">
                <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                  Để nạp tiền vào ví, vui lòng liên hệ với bộ phận Chăm sóc khách hàng để được hướng dẫn chi tiết.
                </p>
              </div>
            </div>

            {/* Chat Buttons */}
            <div className="space-y-4 max-w-md mx-auto">
              {/* Crisp Chat Button */}
              <button
                onClick={openCrispChat}
                className="w-full py-4 px-6 bg-gradient-to-r from-[#ee4d2d] to-[#ff6b4a] text-white rounded-xl font-bold text-base md:text-lg hover:shadow-xl active:scale-98 transition-all shadow-lg flex items-center justify-center gap-3"
              >
                <span className="text-2xl md:text-3xl">💬</span>
                <span>Chat ngay với chúng tôi</span>
              </button>

              {/* Zalo Chat Button */}
              {zaloEnabled === true && zaloLink && zaloLink.trim() !== '' ? (
                <button
                  onClick={handleZaloChat}
                  className="w-full bg-white border-2 border-blue-500 rounded-xl p-4 md:p-5 hover:bg-blue-50 hover:shadow-lg active:scale-98 transition-all shadow-md"
                >
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-2xl md:text-3xl">💬</span>
                    </div>
                    <div className="text-left">
                      <p className="text-xs md:text-sm text-gray-600 font-medium">Zalo</p>
                      <p className="font-bold text-gray-800 text-base md:text-lg">Chat ngay</p>
                    </div>
                  </div>
                </button>
              ) : null}
            </div>
          </div>

          {/* Thông tin hỗ trợ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Thời gian làm việc */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-2xl">🕐</span>
                </div>
                <h3 className="text-lg font-bold text-gray-800">Thời gian làm việc</h3>
              </div>
              <div className="space-y-2">
                <p className="text-base md:text-lg font-semibold text-gray-800">8:00 - 22:00</p>
                <p className="text-sm text-gray-600">Tất cả các ngày trong tuần</p>
              </div>
            </div>

            {/* Phương thức hỗ trợ */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-2xl">📞</span>
                </div>
                <h3 className="text-lg font-bold text-gray-800">Phương thức hỗ trợ</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm md:text-base text-gray-700">💬 Chat trực tuyến</p>
                <p className="text-sm md:text-base text-gray-700">📱 Zalo Chat</p>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-md">
                <span className="text-2xl">❓</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-800">Câu hỏi thường gặp</h3>
            </div>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <h4 className="font-semibold text-gray-800 mb-1">Làm thế nào để nạp tiền?</h4>
                <p className="text-sm text-gray-600">Liên hệ với chúng tôi qua chat để được hướng dẫn chi tiết về cách nạp tiền vào ví.</p>
              </div>
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <h4 className="font-semibold text-gray-800 mb-1">Thời gian xử lý giao dịch?</h4>
                <p className="text-sm text-gray-600">Giao dịch nạp tiền thường được xử lý trong vòng 5-10 phút trong giờ làm việc.</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4 py-2">
                <h4 className="font-semibold text-gray-800 mb-1">Có phí giao dịch không?</h4>
                <p className="text-sm text-gray-600">Chúng tôi không thu phí giao dịch nạp tiền. Số tiền bạn nạp sẽ được cộng đầy đủ vào ví.</p>
              </div>
            </div>
          </div>
        </div>
        <BottomNavigation />
      </div>
    </>
  )
}

