'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import BannerCarousel from '@/components/BannerCarousel'
import NotificationBar from '@/components/NotificationBar'
import ProductCard from '@/components/ProductCard'
import BottomNavigation from '@/components/BottomNavigation'
import CartIcon from '@/components/CartIcon'

interface Category {
  id: number
  name: string
  slug: string
  discount_percent: number
}

interface Product {
  id: number
  name: string
  price: number
  original_price?: number
  image_url?: string
  category_name?: string
  discount_percent?: number
}

export default function CategoryPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [category, setCategory] = useState<Category | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        const userData = data.user
        
        if (userData.role === 'admin') {
          router.push('/admin/dashboard')
          return
        }
        
        setUser(userData)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/login')
    }
  }, [router])

  const fetchCategoryAndProducts = useCallback(async () => {
    setLoading(true)
    try {
      // Lấy thông tin category
      const categoryResponse = await fetch('/api/categories')
      if (categoryResponse.ok) {
        const categoryData = await categoryResponse.json()
        const foundCategory = categoryData.categories?.find((c: Category) => c.slug === slug)
        if (foundCategory) {
          setCategory(foundCategory)
          
          // Lấy sản phẩm theo category
          const productsResponse = await fetch(`/api/products?category_id=${foundCategory.id}`)
          if (productsResponse.ok) {
            const productsData = await productsResponse.json()
            setProducts(productsData.products || [])
          }
        }
      }
    } catch (error) {
      console.error('Error fetching category and products:', error)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    checkAuth()
    fetchCategoryAndProducts()
  }, [checkAuth, fetchCategoryAndProducts])


  const handleLogout = async () => {
    try {
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

  if (!category) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] pb-20">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Danh mục không tồn tại</h1>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-[#ee4d2d] text-white rounded-sm hover:bg-[#f05d40] transition-colors"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-[#ee4d2d]"
            >
              ←
            </button>
            <h1 className="text-xl font-bold text-[#ee4d2d]">{category.name}</h1>
          </div>
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
        {/* Banner Carousel */}
        <div className="mb-4">
          <BannerCarousel />
        </div>

        {/* Products Grid */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Tất cả sản phẩm {category.name}
          </h2>

          {products.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-600 mb-4">Chưa có sản phẩm nào trong danh mục này.</p>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-[#ee4d2d] text-white rounded-sm hover:bg-[#f05d40] transition-colors"
              >
                Về trang chủ
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}

