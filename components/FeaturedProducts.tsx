'use client'

import { useEffect, useState } from 'react'
import ProductCard from './ProductCard'

interface Product {
  id: number
  name: string
  price: number
  original_price?: number
  image_url?: string
  category_name?: string
  discount_percent?: number
}

interface FeaturedProductsProps {
  categoryId?: number
  categoryName?: string
  hasPermission?: boolean
}

export default function FeaturedProducts({ categoryId, categoryName, hasPermission = true }: FeaturedProductsProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [categoryId])

  const fetchProducts = async () => {
    try {
      const url = categoryId
        ? `/api/products?category_id=${categoryId}`
        : '/api/products?featured=true'
      const response = await fetch(url)
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
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
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {categoryName}
        </h2>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} hasPermission={hasPermission} />
        ))}
      </div>
    </div>
  )
}

