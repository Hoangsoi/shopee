'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Category {
  id: number
  name: string
  slug: string
  discount_percent: number
  icon?: string
  hasPermission?: boolean
}

interface CategoryGridProps {
  categories: Category[]
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
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

  const categoryIcons: { [key: string]: string } = {
    'Mỹ phẩm': '💄',
    'Điện tử': '📱',
    'Điện lạnh': '❄️',
    'Cao cấp': '💎',
    'VIP': '⭐',
  }

  const handleLockedCategory = (e: React.MouseEvent, categoryName: string) => {
    e.preventDefault()
    alert(`Bạn chưa có quyền truy cập khu vực "${categoryName}". Vui lòng liên hệ admin để được cấp quyền.`)
  }

  return (
    <div className="grid grid-cols-5 gap-4 py-6">
      {categories.map((category) => {
        const hasPermission = permissions.includes(category.id)
        const isLocked = !hasPermission && !loading
        
        // Đảm bảo discount_percent là số hợp lệ - parse nhiều cách để chắc chắn
        let discountPercent = 0
        if (category.discount_percent !== null && category.discount_percent !== undefined) {
          // Thử parse theo nhiều cách
          const value = category.discount_percent
          if (typeof value === 'number') {
            discountPercent = value
          } else if (typeof value === 'string') {
            const parsed = parseInt(value, 10)
            discountPercent = isNaN(parsed) ? 0 : parsed
          } else {
            const parsed = Number(value)
            discountPercent = isNaN(parsed) ? 0 : Math.floor(parsed)
          }
        }

        // Debug log để kiểm tra giá trị
        if (category.name === 'VIP') {
          console.log('VIP Category Debug:', {
            name: category.name,
            id: category.id,
            raw_discount_percent: category.discount_percent,
            parsed_discountPercent: discountPercent,
            type: typeof category.discount_percent,
            isLocked,
            hasPermission,
            willShow: discountPercent > 0,
            condition: discountPercent > 0,
            fullCategory: category
          })
        }

        return (
          <div
            key={category.id}
            className={`flex flex-col items-center p-4 bg-white rounded-lg shadow-sm transition-all relative ${
              isLocked 
                ? 'opacity-60 cursor-not-allowed' 
                : 'hover:shadow-md cursor-pointer'
            }`}
            onClick={isLocked ? (e) => handleLockedCategory(e, category.name) : undefined}
          >
            {isLocked && (
              <div className="absolute top-2 right-2 text-2xl z-10">
                🔒
              </div>
            )}
            {!isLocked ? (
              <Link
                href={`/category/${category.slug}`}
                className="flex flex-col items-center w-full"
              >
                <div className="text-4xl mb-2">
                  {categoryIcons[category.name] || '📦'}
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm text-gray-800 mb-1">
                    {category.name}
                  </div>
                  {discountPercent > 0 ? (
                    <div className="text-xs text-[#ee4d2d] font-bold">
                      Giảm {discountPercent}%
                    </div>
                  ) : null}
                </div>
              </Link>
            ) : (
              <div className="flex flex-col items-center w-full">
                <div className="text-4xl mb-2">
                  {categoryIcons[category.name] || '📦'}
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm text-gray-800 mb-1">
                    {category.name}
                  </div>
                  {discountPercent > 0 ? (
                    <div className="text-xs text-[#ee4d2d] font-bold">
                      Giảm {discountPercent}%
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

