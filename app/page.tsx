'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import BannerCarousel from '@/components/BannerCarousel'
import BottomNavigation from '@/components/BottomNavigation'
import CartIcon from '@/components/CartIcon'
import CategoryGrid from '@/components/CategoryGrid'
import FeaturedProducts from '@/components/FeaturedProducts'
import NotificationBar from '@/components/NotificationBar'

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

interface Product {
  id: number
  name: string
  price: number
  original_price?: number
  image_url?: string
  category_id?: number
  category_name?: string
  discount_percent?: number
  sales_count?: number
  rating?: number
}

type ProductsByCategory = Record<number, Product[]>

function groupProductsByCategory(products: Product[]): ProductsByCategory {
  return products.reduce<ProductsByCategory>((groups, product) => {
    if (!product.category_id) {
      return groups
    }

    if (!groups[product.category_id]) {
      groups[product.category_id] = []
    }

    groups[product.category_id].push(product)
    return groups
  }, {})
}

function FeaturedProductsByPermission({
  categories,
  permissions,
  permissionsLoading,
  productsByCategory,
  productsLoading,
}: {
  categories: Category[]
  permissions: number[]
  permissionsLoading: boolean
  productsByCategory: ProductsByCategory
  productsLoading: boolean
}) {
  if (permissionsLoading) {
    return <div className="text-center py-8">Đang tải...</div>
  }

  if (categories.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
        Chưa có danh mục nào
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
              categoryName={`Sản phẩm nổi bật - ${category.name}`}
              hasPermission={hasPermission}
              prefetchedProducts={productsLoading ? null : productsByCategory[category.id] ?? []}
              loading={productsLoading}
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
  const [permissions, setPermissions] = useState<number[]>([])
  const [productsByCategory, setProductsByCategory] = useState<ProductsByCategory>({})
  const [loading, setLoading] = useState(true)
  const [permissionsLoading, setPermissionsLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(true)

  useEffect(() => {
    Promise.all([checkAuth(), loadHomepageData()]).catch((error) => {
      console.error('Error loading homepage data:', error)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchCategoriesData = async (): Promise<Category[]> => {
    const response = await fetch('/api/categories')
    if (!response.ok) {
      throw new Error('Failed to fetch categories')
    }

    const data = await response.json()
    const loadedCategories = data.categories || []

    const vipCategory = loadedCategories.find((category: Category) => category.name === 'VIP')
    if (vipCategory && process.env.NODE_ENV === 'development') {
      console.log('Homepage VIP Category Debug:', {
        name: vipCategory.name,
        id: vipCategory.id,
        discount_percent: vipCategory.discount_percent,
        type: typeof vipCategory.discount_percent,
      })
    }

    return loadedCategories
  }

  const fetchPermissionIds = async (): Promise<number[]> => {
    const response = await fetch('/api/user/category-permissions')
    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.permissions.map((permission: any) => permission.category_id)
  }

  const fetchProductsForCategories = async (loadedCategories: Category[]) => {
    if (loadedCategories.length === 0) {
      return {}
    }

    const categoryIds = loadedCategories.map((category) => category.id).join(',')
    const response = await fetch(`/api/products?category_ids=${categoryIds}`)
    if (!response.ok) {
      throw new Error('Failed to fetch products')
    }

    const data = await response.json()
    return groupProductsByCategory(data.products || [])
  }

  const loadHomepageData = async () => {
    setPermissionsLoading(true)
    setProductsLoading(true)

    let loadedCategories: Category[] = []

    try {
      const [categoriesResult, permissionsResult] = await Promise.allSettled([
        fetchCategoriesData(),
        fetchPermissionIds(),
      ])

      if (categoriesResult.status === 'fulfilled') {
        loadedCategories = categoriesResult.value
        setCategories(loadedCategories)
      } else {
        console.error('Error fetching categories:', categoriesResult.reason)
        setCategories([])
      }

      if (permissionsResult.status === 'fulfilled') {
        setPermissions(permissionsResult.value)
      } else {
        console.error('Error fetching permissions:', permissionsResult.reason)
        setPermissions([])
      }
    } finally {
      setPermissionsLoading(false)
    }

    try {
      const groupedProducts = await fetchProductsForCategories(loadedCategories)
      setProductsByCategory(groupedProducts)
    } catch (error) {
      console.error('Error fetching homepage products:', error)
      setProductsByCategory({})
    } finally {
      setProductsLoading(false)
    }
  }

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        const userData = data.user
        const userRole = userData?.role?.toString().trim().toLowerCase()

        if (userRole === 'admin') {
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
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
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
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-[#ee4d2d]">Miinto</h1>
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

      <NotificationBar />

      <div className="container mx-auto px-4 py-4">
        {user.is_frozen && (
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
                    Tài khoản của bạn hiện đang bị đóng băng. Bạn vẫn có thể đăng nhập và xem
                    thông tin, nhưng không thể mua hàng hoặc rút tiền. Vui lòng liên hệ admin để
                    được hỗ trợ.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <BannerCarousel />
        </div>

        {categories.length > 0 ? (
          <div className="mb-6">
            <CategoryGrid
              categories={categories}
              permissions={permissions}
              loadingPermissions={permissionsLoading}
            />
          </div>
        ) : (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            Chưa có danh mục. Vui lòng chạy migration:{' '}
            <code className="bg-yellow-100 px-2 py-1 rounded">npm run setup-db</code>
          </div>
        )}

        {categories.length > 0 ? (
          <FeaturedProductsByPermission
            categories={categories}
            permissions={permissions}
            permissionsLoading={permissionsLoading}
            productsByCategory={productsByCategory}
            productsLoading={productsLoading}
          />
        ) : (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
            Sau khi có danh mục, sản phẩm sẽ hiển thị ở đây. Chạy{' '}
            <code className="bg-blue-100 px-2 py-1 rounded">npm run add-products</code> để thêm
            sản phẩm mẫu.
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
