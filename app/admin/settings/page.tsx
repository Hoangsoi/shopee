'use client'

import { useState, useEffect, useCallback } from 'react'

export default function AdminSettingsPage() {
  const [agentCode, setAgentCode] = useState('')
  const [zaloLink, setZaloLink] = useState('')
  const [zaloEnabled, setZaloEnabled] = useState(true)
  const [vipThresholds, setVipThresholds] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [loadingZalo, setLoadingZalo] = useState(false)
  const [loadingVip, setLoadingVip] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [zaloMessage, setZaloMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [vipMessage, setVipMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchAgentCode = useCallback(async () => {
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
  }, [])

  const fetchZaloSettings = useCallback(async () => {
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
  }, [])

  const fetchVipSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/settings/vip')
      if (response.ok) {
        const data = await response.json()
        if (data.thresholds && Array.isArray(data.thresholds) && data.thresholds.length > 0) {
          setVipThresholds(data.thresholds.map((t: number) => t.toString()))
        } else {
          setVipThresholds([''])
        }
      }
    } catch (error) {
      console.error('Error fetching VIP settings:', error)
    }
  }, [])

  useEffect(() => {
    fetchAgentCode()
    fetchZaloSettings()
    fetchVipSettings()
  }, [fetchAgentCode, fetchZaloSettings, fetchVipSettings])

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

  const handleAddThreshold = () => {
    if (vipThresholds.length < 10) {
      setVipThresholds([...vipThresholds, ''])
    }
  }

  const handleRemoveThreshold = (index: number) => {
    if (vipThresholds.length > 1) {
      setVipThresholds(vipThresholds.filter((_, i) => i !== index))
    }
  }

  const handleThresholdChange = (index: number, value: string) => {
    const newThresholds = [...vipThresholds]
    newThresholds[index] = value
    setVipThresholds(newThresholds)
  }

  const handleUpdateVip = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingVip(true)
    setVipMessage(null)

    try {
      // Parse và validate các ngưỡng
      const thresholds = vipThresholds
        .map(t => t.trim())
        .filter(t => t !== '')
        .map(t => parseFloat(t))
        .filter(t => !isNaN(t) && t >= 0)

      if (thresholds.length === 0) {
        setVipMessage({ type: 'error', text: 'Vui lòng nhập ít nhất một ngưỡng VIP' })
        setLoadingVip(false)
        return
      }

      if (thresholds.length > 10) {
        setVipMessage({ type: 'error', text: 'Tối đa 10 ngưỡng VIP' })
        setLoadingVip(false)
        return
      }

      // Kiểm tra các ngưỡng phải tăng dần
      const sorted = [...thresholds].sort((a, b) => a - b)
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] <= sorted[i - 1]) {
          setVipMessage({ type: 'error', text: 'Các ngưỡng VIP phải tăng dần và không được trùng nhau' })
          setLoadingVip(false)
          return
        }
      }

      const response = await fetch('/api/admin/settings/vip', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ thresholds: sorted }),
      })

      const data = await response.json()

      if (response.ok) {
        setVipMessage({ type: 'success', text: 'Cập nhật cài đặt VIP thành công! Tất cả khách hàng đã được cập nhật cấp độ VIP tự động.' })
        await fetchVipSettings()
      } else {
        setVipMessage({ type: 'error', text: data.error || 'Cập nhật thất bại' })
      }
    } catch (error) {
      setVipMessage({ type: 'error', text: 'Có lỗi xảy ra. Vui lòng thử lại.' })
    } finally {
      setLoadingVip(false)
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
                  className="w-full h-11 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm text-gray-900"
                  style={{ fontSize: '16px' }}
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
                  className="w-full h-11 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm text-gray-900"
                  style={{ fontSize: '16px' }}
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

          {/* VIP Management */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Quản lý cấp độ VIP</h2>
            <form onSubmit={handleUpdateVip} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Các ngưỡng số tiền nạp để đạt các cấp độ VIP (VNĐ)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Nhập các ngưỡng số tiền nạp tối thiểu. Ví dụ: VIP 1 = 50 triệu, VIP 2 = 150 triệu, ...
                  <br />
                  <strong>Lưu ý:</strong> VIP 0 = dưới ngưỡng đầu tiên, VIP 1 = từ ngưỡng đầu tiên đến ngưỡng thứ hai, ...
                </p>
                <div className="space-y-2">
                  {vipThresholds.map((threshold, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-600 font-medium">
                            VIP {index + 1}:
                          </span>
                          <span className="text-xs text-gray-500">
                            {index === 0 
                              ? 'Từ' 
                              : `Từ ${new Intl.NumberFormat('vi-VN').format(parseFloat(vipThresholds[index - 1]) || 0)}đ`} 
                            {' → '}
                            {threshold ? `Dưới ${new Intl.NumberFormat('vi-VN').format(parseFloat(threshold))}đ` : 'Nhập ngưỡng'}
                          </span>
                        </div>
                        <input
                          type="number"
                          value={threshold}
                          onChange={(e) => handleThresholdChange(index, e.target.value)}
                          min="0"
                          step="1000"
                          className="w-full h-11 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm text-gray-900"
                          style={{ fontSize: '16px' }}
                          placeholder={`Ngưỡng VIP ${index + 1} (ví dụ: ${(index + 1) * 50000000})`}
                        />
                      </div>
                      {vipThresholds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveThreshold(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-sm text-sm font-medium transition-colors"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {vipThresholds.length < 10 && (
                  <button
                    type="button"
                    onClick={handleAddThreshold}
                    className="mt-2 px-4 py-2 text-[#ee4d2d] border border-[#ee4d2d] rounded-sm text-sm font-medium hover:bg-[#ee4d2d] hover:text-white transition-colors"
                  >
                    + Thêm ngưỡng VIP
                  </button>
                )}
                <p className="mt-3 text-sm text-gray-500">
                  Khách hàng sẽ tự động đạt cấp độ VIP tương ứng khi tổng số tiền đã nạp (các giao dịch deposit đã completed) đạt ngưỡng tương ứng.
                </p>
              </div>

              {vipMessage && (
                <div
                  className={`py-3 px-4 rounded-sm ${
                    vipMessage.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-600'
                      : 'bg-red-50 border border-red-200 text-red-600'
                  }`}
                >
                  {vipMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingVip}
                className="px-6 py-2 bg-[#ee4d2d] text-white rounded-sm font-medium hover:bg-[#f05d40] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loadingVip ? 'Đang cập nhật...' : 'CẬP NHẬT CÀI ĐẶT VIP'}
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

