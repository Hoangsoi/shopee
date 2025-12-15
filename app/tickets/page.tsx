'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CountdownTimer from '@/components/CountdownTimer'

interface Ticket {
  id: number
  ticket_code: string
  draw_date: string
  created_at: string
  status: string
}

export default function TicketsPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tickets')
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      } else {
        if (response.status === 401) {
          router.push('/login')
        }
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Thông báo cơ cấu giải thưởng */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-orange-200 rounded-2xl shadow-xl p-6 md:p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-orange-600 mb-2">
              🎉 CƠ CẤU GIẢI THƯỞNG CHƯƠNG TRÌNH VÉ THƯỞNG
            </h2>
          </div>

          <div className="space-y-4 mb-6">
            {/* Giải Đặc Biệt */}
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-l-4 border-purple-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">🏆</span>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">Giải Đặc Biệt</h3>
                  <p className="text-gray-700 mb-1"><strong>Phần thưởng:</strong> Mercedes-Benz S-Class</p>
                  <p className="text-gray-700 mb-1"><strong>💰 Giá trị:</strong> 5.500.000.000 VNĐ</p>
                  <p className="text-gray-700"><strong>🎯 Số lượng:</strong> 01 giải</p>
                </div>
              </div>
            </div>

            {/* Giải Nhất */}
            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-l-4 border-yellow-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">🥇</span>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">Giải Nhất</h3>
                  <p className="text-gray-700 mb-1"><strong>Phần thưởng:</strong> Mercedes-Benz E-Class</p>
                  <p className="text-gray-700 mb-1"><strong>💰 Giá trị:</strong> 2.500.000.000 VNĐ</p>
                  <p className="text-gray-700"><strong>🎯 Số lượng:</strong> 04 giải</p>
                </div>
              </div>
            </div>

            {/* Giải Nhì */}
            <div className="bg-gradient-to-r from-gray-100 to-slate-100 border-l-4 border-gray-400 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">🥈</span>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">Giải Nhì</h3>
                  <p className="text-gray-700 mb-1"><strong>Phần thưởng:</strong> Mercedes-Benz C-Class</p>
                  <p className="text-gray-700 mb-1"><strong>💰 Giá trị:</strong> 1.800.000.000 VNĐ</p>
                  <p className="text-gray-700"><strong>🎯 Số lượng:</strong> 06 giải</p>
                </div>
              </div>
            </div>

            {/* Giải Ba */}
            <div className="bg-gradient-to-r from-amber-100 to-yellow-100 border-l-4 border-amber-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">🥉</span>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">Giải Ba</h3>
                  <p className="text-gray-700 mb-1"><strong>Phần thưởng:</strong> Xe máy Honda SH 160i</p>
                  <p className="text-gray-700 mb-1"><strong>💰 Giá trị:</strong> 105.000.000 VNĐ</p>
                  <p className="text-gray-700"><strong>🎯 Số lượng:</strong> 80 giải</p>
                </div>
              </div>
            </div>

            {/* Giải Tư */}
            <div className="bg-gradient-to-r from-blue-100 to-cyan-100 border-l-4 border-blue-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">📱</span>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">Giải Tư</h3>
                  <p className="text-gray-700 mb-1"><strong>Phần thưởng:</strong> iPhone (dòng mới)</p>
                  <p className="text-gray-700 mb-1"><strong>💰 Giá trị:</strong> 28.000.000 VNĐ</p>
                  <p className="text-gray-700"><strong>🎯 Số lượng:</strong> 300 giải</p>
                </div>
              </div>
            </div>

            {/* Giải Năm */}
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-l-4 border-green-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">💻</span>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">Giải Năm</h3>
                  <p className="text-gray-700 mb-1"><strong>Phần thưởng:</strong> Tablet / Laptop phổ thông</p>
                  <p className="text-gray-700 mb-1"><strong>💰 Giá trị:</strong> 20.000.000 VNĐ</p>
                  <p className="text-gray-700"><strong>🎯 Số lượng:</strong> 200 giải</p>
                </div>
              </div>
            </div>

            {/* Giải Khuyến Khích */}
            <div className="bg-gradient-to-r from-pink-100 to-rose-100 border-l-4 border-pink-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">🎁</span>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">Giải Khuyến Khích</h3>
                  <p className="text-gray-700 mb-1"><strong>Phần thưởng:</strong> Quà công nghệ / phụ kiện</p>
                  <p className="text-gray-700 mb-1"><strong>💰 Giá trị:</strong> 2.000.000 VNĐ</p>
                  <p className="text-gray-700"><strong>🎯 Số lượng:</strong> 1.500 giải</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tổng giá trị */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg p-4 mb-6 text-center">
            <p className="text-xl font-bold">👉 Tổng giá trị giải thưởng: 50.100.000.000 VNĐ</p>
          </div>

          {/* Quy định */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-lg text-gray-800 mb-3">💱 QUY ĐỊNH NHẬN THƯỞNG & QUY ĐỔI</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Người trúng thưởng có thể lựa chọn nhận hiện vật hoặc quy đổi sang tiền mặt theo chính sách của chương trình.</li>
              <li>• Việc quy đổi tiền mặt có thể áp dụng mức khấu trừ theo quy định hiện hành.</li>
              <li>• Thời gian và hình thức xử lý giải thưởng được thông báo cụ thể khi xác nhận trúng thưởng.</li>
            </ul>
          </div>

          {/* Địa điểm nhận thưởng */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-bold text-lg text-gray-800 mb-3">📍 ĐỊA ĐIỂM NHẬN HIỆN VẬT</h3>
            <p className="text-sm text-gray-700 mb-3">Người trúng thưởng có thể đến trực tiếp trụ sở của hệ thống để nhận hiện vật tại một trong các địa điểm sau:</p>
            <div className="space-y-3">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                <p className="font-semibold text-gray-800 mb-1">📌 TP. Hồ Chí Minh</p>
                <p className="text-sm text-gray-700">Tầng 17, Saigon Centre 2</p>
                <p className="text-sm text-gray-700">67 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</p>
              </div>
              <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                <p className="font-semibold text-gray-800 mb-1">📌 Hà Nội</p>
                <p className="text-sm text-gray-700">Tầng 4 – 5 – 6, Tòa nhà Capital Place</p>
                <p className="text-sm text-gray-700">29 Liễu Giai, Phường Ngọc Hà, Quận Ba Đình, Hà Nội</p>
              </div>
            </div>
          </div>
        </div>

        {/* Danh sách vé */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl">🎫</span>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Vé dự thưởng của tôi</h1>
              <p className="text-sm text-gray-500 mt-1">Danh sách mã số dự thưởng của bạn</p>
            </div>
          </div>

          {tickets.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🎫</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Bạn chưa có vé dự thưởng nào</h2>
              <p className="text-gray-500">Vé dự thưởng sẽ được admin tạo và gửi cho bạn</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tickets.map((ticket) => {
                const drawDate = new Date(ticket.draw_date)
                const isExpired = drawDate.getTime() <= new Date().getTime()

                return (
                  <div
                    key={ticket.id}
                    className={`border-2 rounded-xl p-5 transition-all hover:shadow-lg ${
                      isExpired
                        ? 'border-green-300 bg-green-50'
                        : 'border-orange-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🎫</span>
                        <div>
                          <div className="text-xs text-gray-500">Mã vé</div>
                          <div className="text-xl font-bold text-orange-600 font-mono">
                            {ticket.ticket_code}
                          </div>
                        </div>
                      </div>
                      {isExpired && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          Đã mở
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Ngày mở thưởng</div>
                        <div className="text-sm font-semibold text-gray-700">
                          {formatDate(ticket.draw_date)}
                        </div>
                      </div>

                      {!isExpired && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Còn lại</div>
                          <CountdownTimer targetDate={ticket.draw_date} />
                        </div>
                      )}

                      <div>
                        <div className="text-xs text-gray-500 mb-1">Ngày tạo</div>
                        <div className="text-xs text-gray-600">
                          {formatDate(ticket.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

