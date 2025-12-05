'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DebugAuthPage() {
  const router = useRouter()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthDebug()
  }, [])

  const checkAuthDebug = async () => {
    try {
      // Get token from cookie
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      // Call /api/auth/me to get user info
      const response = await fetch('/api/auth/me')
      const data = await response.json()

      setDebugInfo({
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token',
        apiResponse: data,
        userRole: data.user?.role,
        userEmail: data.user?.email,
        userRoleType: typeof data.user?.role,
        isRoleAdmin: data.user?.role === 'admin',
        roleComparison: {
          strict: data.user?.role === 'admin',
          lowercase: data.user?.role?.toLowerCase() === 'admin',
          trimmed: data.user?.role?.trim() === 'admin',
        },
        cookies: document.cookie,
      })

      // Also check what login API returns
      if (data.user?.email) {
        // Try to decode token (basic check)
        try {
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]))
            setDebugInfo((prev: any) => ({
              ...prev,
              tokenPayload: payload,
              tokenRole: payload.role,
              tokenRoleType: typeof payload.role,
              isTokenRoleAdmin: payload.role === 'admin',
            }))
          }
        } catch (e) {
          // Ignore decode errors
        }
      }
    } catch (error) {
      setDebugInfo({
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    // Clear all cookies
    document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    router.push('/login')
  }

  const handleClearCookies = () => {
    document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Đang kiểm tra...</div>
      </div>
    )
  }

  const isNotLoggedIn = debugInfo?.apiResponse?.error === 'Chưa đăng nhập' || !debugInfo?.userEmail

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔍 Debug Authentication</h1>

        {isNotLoggedIn && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-blue-800 mb-3">⚠️ Chưa đăng nhập</h2>
            <p className="text-blue-700 mb-4">
              Bạn cần đăng nhập trước để kiểm tra role và token. Vui lòng:
            </p>
            <div className="space-y-2 text-blue-700">
              <p>1. Click nút bên dưới để đăng nhập</p>
              <p>2. Sau khi đăng nhập, quay lại trang này để kiểm tra</p>
              <p>3. Nếu role = &apos;admin&apos;, bạn sẽ tự động được redirect vào trang admin</p>
            </div>
            <div className="mt-4">
              <a
                href="/login"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                → Đi đến trang Đăng nhập
              </a>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Information</h2>
          <div className="space-y-2">
            <p><strong>Email:</strong> {debugInfo?.userEmail || 'N/A'}</p>
            <p><strong>Role (raw):</strong> <code className="bg-gray-100 px-2 py-1 rounded">{JSON.stringify(debugInfo?.userRole)}</code></p>
            <p><strong>Role Type:</strong> {debugInfo?.userRoleType}</p>
            <p><strong>Is Admin? (strict):</strong> 
              <span className={debugInfo?.isRoleAdmin ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {debugInfo?.isRoleAdmin ? ' ✅ YES' : ' ❌ NO'}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Role Comparison Tests</h2>
          <div className="space-y-2 font-mono text-sm">
            <p>role === &apos;admin&apos;: <span className={debugInfo?.roleComparison?.strict ? 'text-green-600' : 'text-red-600'}>{debugInfo?.roleComparison?.strict ? '✅' : '❌'}</span></p>
            <p>role.toLowerCase() === &apos;admin&apos;: <span className={debugInfo?.roleComparison?.lowercase ? 'text-green-600' : 'text-red-600'}>{debugInfo?.roleComparison?.lowercase ? '✅' : '❌'}</span></p>
            <p>role.trim() === &apos;admin&apos;: <span className={debugInfo?.roleComparison?.trimmed ? 'text-green-600' : 'text-red-600'}>{debugInfo?.roleComparison?.trimmed ? '✅' : '❌'}</span></p>
          </div>
        </div>

        {debugInfo?.tokenPayload && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">JWT Token Info</h2>
            <div className="space-y-2">
              <p><strong>Token Role:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{debugInfo.tokenRole}</code></p>
              <p><strong>Token Role Type:</strong> {debugInfo.tokenRoleType}</p>
              <p><strong>Is Token Role Admin?:</strong> 
                <span className={debugInfo.isTokenRoleAdmin ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                  {debugInfo.isTokenRoleAdmin ? ' ✅ YES' : ' ❌ NO'}
                </span>
              </p>
              <details className="mt-4">
                <summary className="cursor-pointer text-blue-600">View Full Token Payload</summary>
                <pre className="bg-gray-100 p-4 mt-2 rounded overflow-auto text-xs">
                  {JSON.stringify(debugInfo.tokenPayload, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Full API Response</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(debugInfo?.apiResponse, null, 2)}
          </pre>
        </div>

        {!isNotLoggedIn && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">⚠️ Diagnostic Results</h2>
            {debugInfo?.isRoleAdmin ? (
              <div className="space-y-2">
                <p className="text-green-600 font-bold">✅ Role is &apos;admin&apos; in database</p>
                {debugInfo?.tokenPayload && !debugInfo?.isTokenRoleAdmin && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-600 font-bold">❌ PROBLEM FOUND: Token still has old role!</p>
                    <p className="mt-2">Token role: <code>{debugInfo.tokenRole}</code></p>
                    <p className="mt-2">Solution: Click "Đăng xuất và đăng nhập lại" button below to get a new token with admin role.</p>
                  </div>
                )}
                {debugInfo?.tokenPayload && debugInfo?.isTokenRoleAdmin && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-600 font-bold">✅ Everything looks good!</p>
                    <p className="mt-2">Both database role and token role are &apos;admin&apos;. You should be able to access admin pages.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-red-600 font-bold">❌ Role is NOT &apos;admin&apos; in database</p>
                <p>Current role: <code>{JSON.stringify(debugInfo?.userRole)}</code></p>
                <p className="mt-2">Solution: Update role in database to &apos;admin&apos; first. See instructions in FIX_ADMIN_REDIRECT.md</p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Đăng xuất và đăng nhập lại
          </button>
          <button
            onClick={handleClearCookies}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
          >
            Clear Cookies và Reload
          </button>
          <button
            onClick={checkAuthDebug}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700"
          >
            Refresh Debug Info
          </button>
        </div>
      </div>
    </div>
  )
}

