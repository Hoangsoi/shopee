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
      <div className="min-h-screen bg-[#f5f5f5] pb-20">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Chăm sóc khách hàng</h1>
          
          <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Nạp tiền vào ví</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 max-w-2xl mx-auto">
                <p className="text-lg text-gray-700 mb-2">
                  Để nạp tiền vào ví, vui lòng liên hệ với bộ phận Chăm sóc khách hàng để được hướng dẫn chi tiết.
                </p>
              </div>

              {/* Chat Button */}
              <div className="mt-8 max-w-md mx-auto">
                <button
                  onClick={openCrispChat}
                  className="w-full py-4 px-6 bg-[#ee4d2d] text-white rounded-lg font-semibold text-lg hover:bg-[#f05d40] active:bg-[#d43d20] transition-colors shadow-md flex items-center justify-center gap-3"
                >
                  <span className="text-2xl">💬</span>
                  <span>Chat ngay với chúng tôi</span>
                </button>
              </div>

              {zaloEnabled === true && zaloLink && zaloLink.trim() !== '' ? (
                <div className="mt-6 max-w-md mx-auto">
                  <button
                    onClick={handleZaloChat}
                    className="w-full bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-[#ee4d2d] hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-2xl">💬</span>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Zalo</p>
                        <p className="font-semibold text-gray-800 text-lg">Chat ngay</p>
                      </div>
                    </div>
                  </button>
                </div>
              ) : null}

              <div className="mt-6 text-sm text-gray-500">
                <p>Thời gian làm việc: 8:00 - 22:00 (Tất cả các ngày trong tuần)</p>
              </div>
            </div>
          </div>
        </div>
        <BottomNavigation />
      </div>
    </>
  )
}

