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

export default function SupportPage() {
  const [zaloNumber, setZaloNumber] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [crispLoaded, setCrispLoaded] = useState(false)

  useEffect(() => {
    fetchZaloNumber()
  }, [])

  useEffect(() => {
    // Initialize Crisp after script loads
    if (typeof window !== 'undefined' && window.$crisp && !crispLoaded) {
      // Hide chat widget completely and disable it
      window.$crisp.push(['do', 'chat:hide'])
      window.$crisp.push(['config', 'position:reverse'])
      // Disable the default chat bubble
      window.$crisp.push(['config', 'hideOnMobile', true])
      setCrispLoaded(true)
    }
  }, [crispLoaded])

  const openCrispChat = () => {
    if (typeof window !== 'undefined' && window.$crisp) {
      // Show and open chat
      window.$crisp.push(['do', 'chat:show'])
      window.$crisp.push(['do', 'chat:open'])
      
      // Listen for chat close event to hide it again
      window.$crisp.push(['on', 'chat:closed', () => {
        if (window.$crisp) {
          window.$crisp.push(['do', 'chat:hide'])
        }
      }])
    } else {
      // If Crisp not loaded yet, try to initialize
      if (typeof window !== 'undefined') {
        window.$crisp = []
        window.CRISP_WEBSITE_ID = '28304a63-17fd-46d3-a249-4090ab8d41f2'
        const d = document
        const s = d.createElement('script')
        s.src = 'https://client.crisp.chat/l.js'
        s.async = true
        d.getElementsByTagName('head')[0].appendChild(s)
        
        // Wait a bit then open
        setTimeout(() => {
          if (window.$crisp) {
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

  const fetchZaloNumber = async () => {
    try {
      const response = await fetch('/api/settings/zalo')
      if (response.ok) {
        const data = await response.json()
        setZaloNumber(data.value || '')
      }
    } catch (error) {
      console.error('Error fetching Zalo number:', error)
    } finally {
      setLoading(false)
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
            // Disable default chat bubble
            window.$crisp.push(['config', 'position:reverse'])
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

              {zaloNumber && (
                <div className="mt-6 max-w-md mx-auto">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-2xl">💬</span>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Zalo</p>
                        <p className="font-semibold text-gray-800 text-lg">{zaloNumber}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

