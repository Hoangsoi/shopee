'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  email: string
  name: string
  role: string
}

export default function AdminPage() {
  const router = useRouter()
  const [agentCode, setAgentCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        const userData = data.user
        
        // Chỉ admin mới được truy cập
        if (userData.role !== 'admin') {
          router.push('/')
          return
        }
        
        setUser(userData)
        fetchAgentCode()
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/login')
    } finally {
      setCheckingAuth(false)
    }
  }

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchAgentCode()
    }
  }, [user])

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
      } else {
        setMessage({ type: 'error', text: data.error || 'Cập nhật thất bại' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Có lỗi xảy ra. Vui lòng thử lại.' })
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth || fetching) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-sm shadow-sm p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-[#ee4d2d]">Quản lý mã đại lý</h1>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                router.push('/login')
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-sm hover:bg-red-600 transition-colors text-sm"
            >
              Đăng xuất
            </button>
          </div>

          <form onSubmit={handleUpdate} className="space-y-6">
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
              className="w-full h-11 bg-[#ee4d2d] text-white rounded-sm font-medium hover:bg-[#f05d40] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Đang cập nhật...' : 'CẬP NHẬT MÃ ĐẠI LÝ'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Thông tin</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Mã đại lý hiện tại: <strong className="text-[#ee4d2d]">{agentCode || 'Chưa có'}</strong></p>
              <p>• Khi thay đổi mã, tất cả đăng ký mới sẽ phải sử dụng mã mới</p>
              <p>• Mã cũ sẽ không còn hợp lệ sau khi cập nhật</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

