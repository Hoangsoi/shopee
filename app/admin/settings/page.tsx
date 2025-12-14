'use client'

import { useState, useEffect, useCallback } from 'react'

export default function AdminSettingsPage() {
  const [agentCode, setAgentCode] = useState('')
  const [vipThresholds, setVipThresholds] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [loadingVip, setLoadingVip] = useState(false)
  const [loadingInvestment, setLoadingInvestment] = useState(false)
  const [loadingSalesBoost, setLoadingSalesBoost] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [salesBoost, setSalesBoost] = useState(0)
  const [salesBoostInterval, setSalesBoostInterval] = useState(0)
  const [salesBoostMessage, setSalesBoostMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [vipMessage, setVipMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [investmentMessage, setInvestmentMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [investmentRates, setInvestmentRates] = useState<Array<{ min_days: number; max_days?: number; rate: number }>>([
    { min_days: 1, max_days: 6, rate: 1.00 },
    { min_days: 7, max_days: 14, rate: 2.00 },
    { min_days: 15, max_days: 29, rate: 3.00 },
    { min_days: 30, rate: 5.00 },
  ])
  const [showClearDataModal, setShowClearDataModal] = useState(false)
  const [clearingData, setClearingData] = useState(false)
  const [clearDataMessage, setClearDataMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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


  const fetchInvestmentSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/settings/investment')
      if (response.ok) {
        const data = await response.json()
        if (data.rates && Array.isArray(data.rates) && data.rates.length > 0) {
          setInvestmentRates(data.rates)
        }
      }
    } catch (error) {
      console.error('Error fetching investment settings:', error)
    }
  }, [])

  const fetchSalesBoost = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/settings/sales-boost')
      if (response.ok) {
        const data = await response.json()
        setSalesBoost(data.value || 0)
        setSalesBoostInterval(data.interval_hours || 0)
      } else {
        // Nếu lỗi 403 hoặc 401, có thể là chưa đăng nhập hoặc không phải admin
        // Không cần log lỗi vì đây là behavior bình thường
        if (response.status !== 403 && response.status !== 401) {
          console.error('Error fetching sales boost:', response.status)
        }
      }
    } catch (error) {
      // Ignore errors silently - không ảnh hưởng đến trang
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching sales boost:', error)
      }
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
    fetchVipSettings()
    fetchInvestmentSettings()
    fetchSalesBoost()
  }, [fetchAgentCode, fetchVipSettings, fetchInvestmentSettings, fetchSalesBoost])

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

  const handleAddInvestmentRate = () => {
    if (investmentRates.length < 10) {
      const lastRate = investmentRates[investmentRates.length - 1]
      const newMinDays = lastRate.max_days ? lastRate.max_days + 1 : lastRate.min_days + 1
      setInvestmentRates([...investmentRates, { min_days: newMinDays, rate: 1.00 }])
    }
  }

  const handleRemoveInvestmentRate = (index: number) => {
    if (investmentRates.length > 1) {
      setInvestmentRates(investmentRates.filter((_, i) => i !== index))
    }
  }

  const handleInvestmentRateChange = (index: number, field: 'min_days' | 'max_days' | 'rate', value: string) => {
    const newRates = [...investmentRates]
    if (field === 'rate') {
      newRates[index] = { ...newRates[index], rate: parseFloat(value) || 0 }
    } else if (field === 'min_days') {
      newRates[index] = { ...newRates[index], min_days: parseInt(value) || 1 }
    } else if (field === 'max_days') {
      newRates[index] = { ...newRates[index], max_days: value === '' ? undefined : parseInt(value) || undefined }
    }
    setInvestmentRates(newRates)
  }

  const handleUpdateInvestment = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingInvestment(true)
    setInvestmentMessage(null)

    try {
      // Validate rates
      for (let i = 0; i < investmentRates.length; i++) {
        const rate = investmentRates[i]
        if (rate.min_days < 1) {
          setInvestmentMessage({ type: 'error', text: `Mức ${i + 1}: Số ngày tối thiểu phải >= 1` })
          setLoadingInvestment(false)
          return
        }
        if (rate.rate < 0 || rate.rate > 100) {
          setInvestmentMessage({ type: 'error', text: `Mức ${i + 1}: Tỷ lệ lợi nhuận phải từ 0 đến 100%` })
          setLoadingInvestment(false)
          return
        }
        if (rate.max_days && rate.max_days < rate.min_days) {
          setInvestmentMessage({ type: 'error', text: `Mức ${i + 1}: Số ngày tối đa phải >= số ngày tối thiểu` })
          setLoadingInvestment(false)
          return
        }
      }

      const response = await fetch('/api/admin/settings/investment', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rates: investmentRates }),
      })

      const data = await response.json()

      if (response.ok) {
        setInvestmentMessage({ type: 'success', text: 'Cập nhật tỷ lệ lợi nhuận đầu tư thành công!' })
        await fetchInvestmentSettings()
      } else {
        setInvestmentMessage({ type: 'error', text: data.error || 'Cập nhật thất bại' })
      }
    } catch (error) {
      setInvestmentMessage({ type: 'error', text: 'Có lỗi xảy ra. Vui lòng thử lại.' })
    } finally {
      setLoadingInvestment(false)
    }
  }

  const handleUpdateSalesBoost = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingSalesBoost(true)
    setSalesBoostMessage(null)

    try {
      const newValue = parseInt(String(salesBoost))
      if (isNaN(newValue) || newValue < 0) {
        setSalesBoostMessage({ type: 'error', text: 'Giá trị phải là số nguyên dương' })
        setLoadingSalesBoost(false)
        return
      }

      const intervalHours = parseInt(String(salesBoostInterval)) || 0
      if (intervalHours < 0) {
        setSalesBoostMessage({ type: 'error', text: 'Thời gian phải là số nguyên dương (0 = tắt tự động)' })
        setLoadingSalesBoost(false)
        return
      }

      const response = await fetch('/api/admin/settings/sales-boost', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: newValue, interval_hours: intervalHours }),
      })

      const data = await response.json()

      if (response.ok) {
        setSalesBoostMessage({ 
          type: 'success', 
          text: data.message || 'Cập nhật giá trị cộng thêm cho lượt bán thành công!' 
        })
        await fetchSalesBoost()
      } else {
        setSalesBoostMessage({ type: 'error', text: data.error || 'Cập nhật thất bại' })
      }
    } catch (error) {
      setSalesBoostMessage({ type: 'error', text: 'Có lỗi xảy ra. Vui lòng thử lại.' })
    } finally {
      setLoadingSalesBoost(false)
    }
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

          {/* Investment Management */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Quản lý đầu tư</h2>
            <form onSubmit={handleUpdateInvestment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tỷ lệ lợi nhuận theo số ngày đầu tư (%)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Cấu hình tỷ lệ lợi nhuận khác nhau cho các khoảng thời gian đầu tư khác nhau.
                  <br />
                  <strong>Lưu ý:</strong> Các mức phải không trùng nhau và tăng dần. Mức cuối cùng có thể không có max_days (áp dụng cho tất cả số ngày lớn hơn).
                </p>
                <div className="space-y-3">
                  {investmentRates.map((rate, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-semibold text-gray-700">Mức {index + 1}:</span>
                        {index > 0 && (() => {
                          const prevRate = investmentRates[index - 1];
                          if (!prevRate) return null;
                          return (
                            <span className="text-xs text-gray-500">
                              Từ {prevRate.max_days ? `${prevRate.max_days + 1}` : `${prevRate.min_days + 1}`} ngày
                            </span>
                          );
                        })()}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Số ngày tối thiểu</label>
                          <input
                            type="number"
                            value={rate.min_days}
                            onChange={(e) => handleInvestmentRateChange(index, 'min_days', e.target.value)}
                            min="1"
                            required
                            className="w-full h-10 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm text-gray-900"
                            style={{ fontSize: '16px' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Số ngày tối đa (tùy chọn)</label>
                          <input
                            type="number"
                            value={rate.max_days || ''}
                            onChange={(e) => handleInvestmentRateChange(index, 'max_days', e.target.value)}
                            min={rate.min_days}
                            placeholder="Không giới hạn"
                            className="w-full h-10 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm text-gray-900"
                            style={{ fontSize: '16px' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Tỷ lệ lợi nhuận (%)</label>
                          <input
                            type="number"
                            value={rate.rate}
                            onChange={(e) => handleInvestmentRateChange(index, 'rate', e.target.value)}
                            min="0"
                            max="100"
                            step="0.01"
                            required
                            className="w-full h-10 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm text-gray-900"
                            style={{ fontSize: '16px' }}
                          />
                        </div>
                      </div>
                      {investmentRates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveInvestmentRate(index)}
                          className="mt-2 px-3 py-1 text-red-600 hover:bg-red-50 rounded-sm text-xs font-medium transition-colors"
                        >
                          Xóa mức này
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {investmentRates.length < 10 && (
                  <button
                    type="button"
                    onClick={handleAddInvestmentRate}
                    className="mt-3 px-4 py-2 text-[#ee4d2d] border border-[#ee4d2d] rounded-sm text-sm font-medium hover:bg-[#ee4d2d] hover:text-white transition-colors"
                  >
                    + Thêm mức tỷ lệ
                  </button>
                )}
                <p className="mt-3 text-sm text-gray-500">
                  <strong>Ví dụ:</strong> Dưới 7 ngày: 1%, Từ 7-14 ngày: 2%, Từ 15-29 ngày: 3%, Từ 30 ngày trở lên: 5%
                </p>
              </div>

              {investmentMessage && (
                <div
                  className={`py-3 px-4 rounded-sm ${
                    investmentMessage.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-600'
                      : 'bg-red-50 border border-red-200 text-red-600'
                  }`}
                >
                  {investmentMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingInvestment}
                className="px-6 py-2 bg-[#ee4d2d] text-white rounded-sm font-medium hover:bg-[#f05d40] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loadingInvestment ? 'Đang cập nhật...' : 'CẬP NHẬT TỶ LỆ LỢI NHUẬN'}
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

          {/* Sales Boost Management */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Cài đặt lượt bán sản phẩm</h2>
            <form onSubmit={handleUpdateSalesBoost} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sales-boost" className="block text-sm font-medium text-gray-700 mb-2">
                    Giá trị cộng thêm cho lượt bán
                  </label>
                  <input
                    id="sales-boost"
                    type="number"
                    value={salesBoost}
                    onChange={(e) => setSalesBoost(parseInt(e.target.value) || 0)}
                    min="0"
                    required
                    className="w-full h-11 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm text-gray-900"
                    style={{ fontSize: '16px' }}
                    placeholder="Nhập giá trị (ví dụ: 5)"
                  />
                </div>
                <div>
                  <label htmlFor="sales-boost-interval" className="block text-sm font-medium text-gray-700 mb-2">
                    Tự động cộng thêm mỗi (giờ)
                  </label>
                  <input
                    id="sales-boost-interval"
                    type="number"
                    value={salesBoostInterval}
                    onChange={(e) => setSalesBoostInterval(parseInt(e.target.value) || 0)}
                    min="0"
                    required
                    className="w-full h-11 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm text-gray-900"
                    style={{ fontSize: '16px' }}
                    placeholder="Nhập số giờ (ví dụ: 1, 0 = tắt)"
                  />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>📌 Cách hoạt động:</strong>
                </p>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>
                    <strong>Giá trị cộng thêm:</strong> Số lượt bán sẽ được cộng thêm cho mỗi sản phẩm
                  </li>
                  <li>
                    <strong>Tự động cộng thêm mỗi (giờ):</strong> 
                    {salesBoostInterval > 0 ? (
                      <span> Cứ mỗi <strong>{salesBoostInterval} giờ</strong>, hệ thống sẽ tự động cộng thêm <strong>{salesBoost}</strong> lượt bán cho <strong>TẤT CẢ</strong> sản phẩm</span>
                    ) : (
                      <span> Đặt <strong>0</strong> để tắt tự động. Giá trị chỉ được cộng thêm một lần khi cài đặt.</span>
                    )}
                  </li>
                  <li>
                    <strong>Ví dụ:</strong> Nếu bạn cài đặt giá trị = <strong>5</strong> và thời gian = <strong>1 giờ</strong>, thì cứ mỗi 1 giờ, tất cả sản phẩm sẽ được cộng thêm 5 lượt bán vào database.
                  </li>
                </ul>
              </div>
              <p className="text-xs text-gray-400">
                <strong>Lưu ý:</strong> Khi bật tự động (interval {'>'} 0), bạn có thể thay đổi giá trị tự do. Khi tắt tự động (interval = 0), giá trị chỉ có thể tăng, không thể giảm.
              </p>

              {salesBoostMessage && (
                <div
                  className={`py-3 px-4 rounded-sm ${
                    salesBoostMessage.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-600'
                      : 'bg-red-50 border border-red-200 text-red-600'
                  }`}
                >
                  {salesBoostMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingSalesBoost}
                className="px-6 py-2 bg-[#ee4d2d] text-white rounded-sm font-medium hover:bg-[#f05d40] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loadingSalesBoost ? 'Đang cập nhật...' : 'CẬP NHẬT GIÁ TRỊ CỘNG THÊM'}
              </button>
            </form>
          </div>

          {/* Clear Data Section */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Xóa dữ liệu giao dịch</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800 mb-2">Cảnh báo quan trọng</h3>
                  <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                    <li>Thao tác này sẽ xóa <strong>TẤT CẢ</strong> giao dịch và đơn hàng trong hệ thống</li>
                    <li>Dữ liệu đã xóa <strong>KHÔNG THỂ</strong> khôi phục</li>
                    <li>Hãy đảm bảo bạn đã sao lưu dữ liệu trước khi thực hiện</li>
                    <li>Chỉ thực hiện khi thực sự cần thiết</li>
                  </ul>
                </div>
              </div>
            </div>

            {clearDataMessage && (
              <div
                className={`py-3 px-4 rounded-sm mb-4 ${
                  clearDataMessage.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-600'
                    : 'bg-red-50 border border-red-200 text-red-600'
                }`}
              >
                {clearDataMessage.text}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowClearDataModal(true)}
              disabled={clearingData}
              className="px-6 py-2 bg-red-600 text-white rounded-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {clearingData ? 'Đang xóa...' : 'XÓA TẤT CẢ GIAO DỊCH VÀ ĐƠN HÀNG'}
            </button>
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

      {/* Clear Data Confirmation Modal */}
      {showClearDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Xác nhận xóa dữ liệu</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Bạn có chắc chắn muốn xóa <strong>TẤT CẢ</strong> giao dịch và đơn hàng không?
                </p>
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <p className="text-xs text-red-800 font-semibold mb-1">⚠️ Hành động này không thể hoàn tác!</p>
                  <p className="text-xs text-red-700">
                    Tất cả dữ liệu giao dịch và đơn hàng sẽ bị xóa vĩnh viễn.
                  </p>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Để xác nhận, vui lòng nhập <strong className="text-red-600">&quot;XÓA TẤT CẢ&quot;</strong> vào ô bên dưới:
                </p>
                <input
                  type="text"
                  id="confirm-text"
                  placeholder="Nhập: XÓA TẤT CẢ"
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-red-500 text-sm"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowClearDataModal(false)
                  setClearDataMessage(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm font-medium hover:bg-gray-50 transition-colors text-sm"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  const confirmText = (document.getElementById('confirm-text') as HTMLInputElement)?.value
                  if (confirmText !== 'XÓA TẤT CẢ') {
                    setClearDataMessage({
                      type: 'error',
                      text: 'Vui lòng nhập chính xác "XÓA TẤT CẢ" để xác nhận',
                    })
                    return
                  }

                  setClearingData(true)
                  setClearDataMessage(null)

                  try {
                    const response = await fetch('/api/admin/clear-data', {
                      method: 'DELETE',
                    })

                    const data = await response.json()

                    if (response.ok) {
                      setClearDataMessage({
                        type: 'success',
                        text: 'Đã xóa tất cả giao dịch và đơn hàng thành công!',
                      })
                      setShowClearDataModal(false)
                      // Reload page after 2 seconds to refresh data
                      setTimeout(() => {
                        window.location.reload()
                      }, 2000)
                    } else {
                      setClearDataMessage({
                        type: 'error',
                        text: data.error || 'Xóa dữ liệu thất bại',
                      })
                    }
                  } catch (error) {
                    setClearDataMessage({
                      type: 'error',
                      text: 'Có lỗi xảy ra. Vui lòng thử lại.',
                    })
                  } finally {
                    setClearingData(false)
                  }
                }}
                disabled={clearingData}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {clearingData ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
            {clearDataMessage && (
              <div
                className={`mt-4 py-2 px-3 rounded text-sm ${
                  clearDataMessage.type === 'success'
                    ? 'bg-green-50 text-green-600'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {clearDataMessage.text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

