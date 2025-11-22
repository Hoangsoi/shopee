'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BannerCarousel from '@/components/BannerCarousel'
import NotificationBar from '@/components/NotificationBar'
import CategoryGrid from '@/components/CategoryGrid'
import FeaturedProducts from '@/components/FeaturedProducts'
import BottomNavigation from '@/components/BottomNavigation'
import CartIcon from '@/components/CartIcon'

interface User {
  id: number
  email: string
  name: string
  role: string
  created_at: string
  is_frozen?: boolean
}

interface Category {
  id: number
  name: string
  slug: string
  discount_percent: number
  icon?: string
}

// Component để hiển thị sản phẩm - hiển thị TẤT CẢ nhưng đánh dấu category có quyền
function FeaturedProductsByPermission({ categories }: { categories: Category[] }) {
  const [permissions, setPermissions] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPermissions()
  }, [])

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/user/category-permissions')
      if (response.ok) {
        const data = await response.json()
        const categoryIds = data.permissions.map((p: any) => p.category_id)
        setPermissions(categoryIds)
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Hiển thị TẤT CẢ categories, nhưng truyền thông tin quyền vào component
  if (loading) {
    return <div className="text-center py-8">Đang tải...</div>
  }

  if (categories.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
        ⚠️ Chưa có danh mục nào
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const hasPermission = permissions.includes(category.id)
        return (
          <div key={category.id}>
            <FeaturedProducts
              categoryId={category.id}
              categoryName={`Sản phẩm nổi bật - ${category.name}`}
              hasPermission={hasPermission}
            />
            {!hasPermission && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm text-center">
                🔒 Bạn chưa có quyền mua hàng ở khu vực này. Vui lòng liên hệ admin để được cấp quyền.
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        const userData = data.user
        
                // Nếu là admin, redirect đến trang admin dashboard
                if (userData.role === 'admin') {
                  router.push('/admin/dashboard')
                  return
                }
        
        setUser(userData)
        
        // Hiển thị thông báo nếu tài khoản bị đóng băng
        if (userData.is_frozen) {
          // Thông báo sẽ được hiển thị trong UI
        }
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleLogout = async () => {
    try {
      // Reset Crisp session before logout to clear chat history
      if (typeof window !== 'undefined' && window.$crisp) {
        window.$crisp.push(['do', 'session:reset'])
        window.$crisp.push(['set', 'user:email', ''])
        window.$crisp.push(['set', 'user:nickname', ''])
        window.$crisp.push(['set', 'session:data', []])
        window.$crisp.push(['do', 'chat:hide'])
      }
      
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-[#ee4d2d]">Đại Lý Shopee</h1>
          <div className="flex items-center gap-4">
            <CartIcon />
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-[#ee4d2d]"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Notification Bar */}
      <NotificationBar />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4">
        {/* Thông báo tài khoản bị đóng băng */}
        {user && user.is_frozen && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🔒</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Tài khoản của bạn đã bị đóng băng
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    Tài khoản của bạn hiện đang bị đóng băng. Bạn vẫn có thể đăng nhập và xem thông tin, 
                    nhưng không thể mua hàng hoặc rút tiền. Vui lòng liên hệ admin để được hỗ trợ.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Banner Carousel */}
        <div className="mb-4">
          <BannerCarousel />
        </div>

        {/* Categories */}
        {categories.length > 0 ? (
          <div className="mb-6">
            <CategoryGrid categories={categories} />
          </div>
        ) : (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            ⚠️ Chưa có danh mục. Vui lòng chạy migration: <code className="bg-yellow-100 px-2 py-1 rounded">npm run setup-db</code>
          </div>
        )}

        {/* Featured Products by Category - Chỉ hiển thị các category có quyền */}
        {categories.length > 0 ? (
          <FeaturedProductsByPermission categories={categories} />
        ) : (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
            💡 Sau khi có danh mục, sản phẩm sẽ hiển thị ở đây. Chạy <code className="bg-blue-100 px-2 py-1 rounded">npm run add-products</code> để thêm sản phẩm mẫu.
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}
