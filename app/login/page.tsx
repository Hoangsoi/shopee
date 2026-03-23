'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check URL params on client side only
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('registered') === 'true') {
        setSuccess('Đăng ký thành công! Vui lòng đăng nhập.')
        // Clean URL
        window.history.replaceState({}, '', '/login')
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        // Reset Crisp session when new user logs in to ensure clean session
        if (typeof window !== 'undefined' && window.$crisp) {
          window.$crisp.push(['do', 'session:reset'])
          // Set new user data
          if (data.user?.email) {
            window.$crisp.push(['set', 'user:email', data.user.email])
          }
          if (data.user?.name) {
            window.$crisp.push(['set', 'user:nickname', data.user.name])
          }
          if (data.user?.id) {
            window.$crisp.push(['set', 'session:data', [
              ['user_id', data.user.id.toString()],
              ['user_email', data.user.email || ''],
              ['user_name', data.user.name || ''],
              ['user_role', data.user.role || 'user']
            ]])
          }
        }
        
        // Kiểm tra role (trim và lowercase để tránh lỗi)
        const userRole = data.user?.role?.toString().trim().toLowerCase()
        
        // Debug logging
        console.log('Login successful:', {
          email: data.user?.email,
          role: data.user?.role,
          roleNormalized: userRole,
          shouldRedirectToAdmin: userRole === 'admin'
        })
        
        // Đợi một chút để đảm bảo cookie được set
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Redirect theo role
        if (userRole === 'admin') {
          console.log('Redirecting to /admin for admin user')
          // Sử dụng window.location.href để đảm bảo redirect hoàn toàn
          window.location.href = '/admin'
        } else {
          console.log('Redirecting to / for regular user')
          window.location.href = '/'
        }
      } else {
        setError(data.error || 'Đăng nhập thất bại')
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
          <p className="text-sm text-gray-600">Đăng nhập</p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-sm shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off" data-form-type="other">
            {/* Email */}
            <div>
              <input
                type="email"
                name="email"
                id="email"
                placeholder="Email"
                required
                autoComplete="username"
                className="w-full h-11 px-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-sm text-gray-900"
                style={{ fontSize: '16px' }}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                id="password"
                placeholder="Mật khẩu"
                required
                autoComplete="current-password"
                data-form-type="other"
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

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 text-sm py-2 px-3 rounded-sm">
                {success}
              </div>
            )}

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
              {loading ? 'Đang đăng nhập...' : 'ĐĂNG NHẬP'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center text-sm text-gray-600">
              Bạn chưa có tài khoản?{' '}
              <Link href="/register" className="text-[#ee4d2d] hover:underline">
                Đăng ký
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Bằng việc đăng nhập, bạn đã đồng ý với Điều khoản sử dụng của chúng tôi</p>
        </div>
      </div>
    </div>
  )
}
