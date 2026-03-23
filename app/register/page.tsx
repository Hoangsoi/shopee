'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    agent_code: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.phone || !/^[0-9]{10,11}$/.test(formData.phone)) {
      setError('Số điện thoại phải có 10-11 chữ số')
      return
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Email không hợp lệ')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    if (!formData.agent_code || formData.agent_code.trim() === '') {
      setError('Mã đại lý không được để trống')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
          agent_code: formData.agent_code || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/login?registered=true')
      } else {
        setError(data.error || 'Đăng ký thất bại')
      }
    } catch (error) {
      setError('Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-[400px]">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#ee4d2d] mb-2">Minto</h1>
          <p className="text-sm text-gray-600">Đăng ký</p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-sm shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Họ tên */}
            <div>
              <input
                type="text"
                placeholder="Họ và tên"
                required
                autoComplete="name"
                className="w-full h-11 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm text-gray-900"
                style={{ fontSize: '16px' }}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Số điện thoại */}
            <div>
              <input
                type="tel"
                placeholder="Số điện thoại"
                required
                autoComplete="tel"
                className="w-full h-11 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm text-gray-900"
                style={{ fontSize: '16px' }}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                maxLength={11}
              />
            </div>

            {/* Email */}
            <div>
              <input
                type="email"
                placeholder="Email"
                required
                autoComplete="email"
                className="w-full h-11 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm text-gray-900"
                style={{ fontSize: '16px' }}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Mật khẩu */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Mật khẩu"
                required
                autoComplete="new-password"
                className="w-full h-11 px-3 pr-10 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm text-gray-900"
                style={{ fontSize: '16px' }}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {/* Nhập lại mật khẩu */}
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Nhập lại mật khẩu"
                required
                autoComplete="new-password"
                className="w-full h-11 px-3 pr-10 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm text-gray-900"
                style={{ fontSize: '16px' }}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                tabIndex={-1}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {/* Mã đại lý */}
            <div>
              <input
                type="text"
                placeholder="Mã đại lý"
                required
                autoComplete="off"
                className="w-full h-11 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm text-gray-900"
                style={{ fontSize: '16px' }}
                value={formData.agent_code}
                onChange={(e) => setFormData({ ...formData, agent_code: e.target.value })}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm py-2 px-3 rounded-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#ee4d2d] text-white rounded-sm font-medium hover:bg-[#f05d40] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Đang đăng ký...' : 'ĐĂNG KÝ'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center text-sm text-gray-600">
              Bạn đã có tài khoản?{' '}
              <Link href="/login" className="text-[#ee4d2d] hover:underline">
                Đăng nhập
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Bằng việc đăng ký, bạn đã đồng ý với Điều khoản sử dụng của chúng tôi</p>
        </div>
      </div>
    </div>
  )
}
