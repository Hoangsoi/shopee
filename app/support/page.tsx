'use client'

import BottomNavigation from '@/components/BottomNavigation'

export default function SupportPage() {
  return (
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

            <div className="mt-8 space-y-4 max-w-md mx-auto">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3 text-lg">Thông tin liên hệ</h3>
                <div className="text-left space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📞</span>
                    <div>
                      <p className="text-sm text-gray-600">Hotline</p>
                      <p className="font-semibold text-gray-800">1900-xxxx</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📧</span>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold text-gray-800">support@dailyshopee.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💬</span>
                    <div>
                      <p className="text-sm text-gray-600">Zalo</p>
                      <p className="font-semibold text-gray-800">0123-456-789</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-sm text-gray-500">
              <p>Thời gian làm việc: 8:00 - 22:00 (Tất cả các ngày trong tuần)</p>
            </div>
          </div>
        </div>
      </div>
      <BottomNavigation />
    </div>
  )
}

