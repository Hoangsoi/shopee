'use client'

import { memo, useEffect, useState } from 'react'

import ProductCard from './ProductCard'

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

interface FeaturedProductsProps {
  categoryId?: number
  categoryName?: string
  hasPermission?: boolean
  prefetchedProducts?: Product[] | null
  loading?: boolean
}

function FeaturedProducts({
  categoryId,
  categoryName,
  hasPermission = true,
  prefetchedProducts,
  loading: externalLoading = false,
}: FeaturedProductsProps) {
  const managedExternally = prefetchedProducts !== undefined
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(!managedExternally)

  useEffect(() => {
    if (!managedExternally) {
      setLoading(true)
      return
    }

    setProducts(prefetchedProducts ?? [])
    setLoading(false)
  }, [managedExternally, prefetchedProducts])

  useEffect(() => {
    if (managedExternally) {
      return
    }

    let cancelled = false

    const fetchProducts = async () => {
      try {
        const url = categoryId
          ? `/api/products?category_id=${categoryId}`
          : '/api/products?featured=true'
        const response = await fetch(url)
        const data = await response.json()

        if (!cancelled) {
          setProducts(data.products || [])
        }
      } catch (error) {
        console.error('Error fetching products:', error)
        if (!cancelled) {
          setProducts([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchProducts()

    return () => {
      cancelled = true
    }
  }, [categoryId, managedExternally])

  if (loading || externalLoading) {
    return <div className="text-center py-8">Đang tải...</div>
  }

  if (products.length === 0) {
    return (
      <div className="mb-8">
        {categoryName && (
          <h2 className="text-xl font-bold text-gray-800 mb-4">{categoryName}</h2>
        )}
        <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
          Chưa có sản phẩm nào trong danh mục này.
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      {categoryName && (
        <h2 className="text-xl font-bold text-gray-800 mb-4">{categoryName}</h2>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} hasPermission={hasPermission} />
        ))}
      </div>
    </div>
  )
}

export default memo(FeaturedProducts)
