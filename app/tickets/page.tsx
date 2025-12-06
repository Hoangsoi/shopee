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

  useEffect(() => {
    fetchTickets()
  }, [])

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
      <div className="max-w-6xl mx-auto">
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

