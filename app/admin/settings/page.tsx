'use client'

import { useState, useEffect } from 'react'

export default function AdminSettingsPage() {
  const [agentCode, setAgentCode] = useState('')
  const [zaloLink, setZaloLink] = useState('')
  const [zaloEnabled, setZaloEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingZalo, setLoadingZalo] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [zaloMessage, setZaloMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchAgentCode()
    fetchZaloSettings()
  }, [])

  const fetchAgentCode = async () => {
    try {
      const response = await fetch('/api/admin/agent-code')
      if (response.ok) {
        const data = await response.json()
        setAgentCode(data.value || '')
      }
    } catch (error) {
      console.error('Error fetching agent code:', error)
    } finally {
      setFetching(false)
    }
  }

  const fetchZaloSettings = async () => {
    try {
      const response = await fetch('/api/admin/zalo')
      if (response.ok) {
        const data = await response.json()
        setZaloLink(data.link || '')
        setZaloEnabled(data.enabled !== false)
      }
    } catch (error) {
      console.error('Error fetching Zalo settings:', error)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/agent-code', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: agentCode }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Cập nhật mã đại lý thành công!' })
        // Refresh lại giá trị từ database sau khi cập nhật thành công
        await fetchAgentCode()
      } else {
        setMessage({ type: 'error', text: data.error || 'Cập nhật thất bại' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Có lỗi xảy ra. Vui lòng thử lại.' })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateZalo = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingZalo(true)
    setZaloMessage(null)

    try {
      const response = await fetch('/api/admin/zalo', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link: zaloLink, enabled: zaloEnabled }),
      })

      const data = await response.json()

      if (response.ok) {
        setZaloMessage({ type: 'success', text: 'Cập nhật cài đặt Zalo thành công!' })
        await fetchZaloSettings()
      } else {
        setZaloMessage({ type: 'error', text: data.error || 'Cập nhật thất bại' })
      }
    } catch (error) {
      setZaloMessage({ type: 'error', text: 'Có lỗi xảy ra. Vui lòng thử lại.' })
    } finally {
      setLoadingZalo(false)
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-[#ee4d2d] mb-6">Cài đặt hệ thống</h1>

          {/* Agent Code Management */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Quản lý mã đại lý</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label htmlFor="agent-code" className="block text-sm font-medium text-gray-700 mb-2">
                  Mã đại lý hợp lệ
                </label>
                <input
                  id="agent-code"
                  type="text"
                  value={agentCode}
                  onChange={(e) => setAgentCode(e.target.value)}
                  required
                  className="w-full h-11 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm"
                  placeholder="Nhập mã đại lý"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Mã này sẽ được sử dụng để xác thực khi khách hàng đăng ký. Chỉ mã này mới được chấp nhận.
                </p>
              </div>

              {message && (
                <div
                  className={`py-3 px-4 rounded-sm ${
                    message.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-600'
                      : 'bg-red-50 border border-red-200 text-red-600'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-[#ee4d2d] text-white rounded-sm font-medium hover:bg-[#f05d40] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Đang cập nhật...' : 'CẬP NHẬT MÃ ĐẠI LÝ'}
              </button>
            </form>
          </div>

          {/* Zalo Management */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Quản lý Zalo</h2>
            <form onSubmit={handleUpdateZalo} className="space-y-4">
              <div>
                <label htmlFor="zalo-link" className="block text-sm font-medium text-gray-700 mb-2">
                  Link chat Zalo
                </label>
                <input
                  id="zalo-link"
                  type="url"
                  value={zaloLink}
                  onChange={(e) => setZaloLink(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm"
                  placeholder="Nhập link chat Zalo (ví dụ: https://zalo.me/098876543)"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Link này sẽ được sử dụng khi khách hàng click nút &quot;Chat ngay&quot; ở mục Zalo trên trang CSKH.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="zalo-enabled"
                  type="checkbox"
                  checked={zaloEnabled}
                  onChange={(e) => setZaloEnabled(e.target.checked)}
                  className="w-4 h-4 text-[#ee4d2d] border-gray-300 rounded focus:ring-[#ee4d2d]"
                />
                <label htmlFor="zalo-enabled" className="text-sm font-medium text-gray-700">
                  Hiển thị mục Zalo trên trang CSKH
                </label>
              </div>
              <p className="text-sm text-gray-500 -mt-2">
                Bật/tắt để ẩn hoặc hiện mục Zalo trên trang Chăm sóc khách hàng.
              </p>

              {zaloMessage && (
                <div
                  className={`py-3 px-4 rounded-sm ${
                    zaloMessage.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-600'
                      : 'bg-red-50 border border-red-200 text-red-600'
                  }`}
                >
                  {zaloMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingZalo}
                className="px-6 py-2 bg-[#ee4d2d] text-white rounded-sm font-medium hover:bg-[#f05d40] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loadingZalo ? 'Đang cập nhật...' : 'CẬP NHẬT CÀI ĐẶT ZALO'}
              </button>
            </form>
          </div>

          {/* System Information */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Thông tin hệ thống</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <p>• Mã đại lý hiện tại: <strong className="text-[#ee4d2d]">{agentCode || 'Chưa có'}</strong></p>
              <p>• Khi thay đổi mã, tất cả đăng ký mới sẽ phải sử dụng mã mới</p>
              <p>• Mã cũ sẽ không còn hợp lệ sau khi cập nhật</p>
              <p>• Để quản lý toàn bộ website, sử dụng menu Dashboard</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

