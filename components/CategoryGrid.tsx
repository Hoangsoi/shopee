'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

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
  permissions?: number[]
  loadingPermissions?: boolean
}

export default function CategoryGrid({
  categories,
  permissions,
  loadingPermissions = false,
}: CategoryGridProps) {
  const usingProvidedPermissions = permissions !== undefined
  const [localPermissions, setLocalPermissions] = useState<number[]>([])
  const [loading, setLoading] = useState(!usingProvidedPermissions)

  useEffect(() => {
    if (usingProvidedPermissions) {
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchPermissions = async () => {
      try {
        const response = await fetch('/api/user/category-permissions')
        if (!response.ok || cancelled) {
          return
        }

        const data = await response.json()
        const categoryIds = data.permissions.map((permission: any) => permission.category_id)
        if (!cancelled) {
          setLocalPermissions(categoryIds)
        }
      } catch (error) {
        console.error('Error fetching permissions:', error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchPermissions()

    return () => {
      cancelled = true
    }
  }, [usingProvidedPermissions])

  const resolvedPermissions = usingProvidedPermissions ? permissions : localPermissions
  const isLoadingPermissions = usingProvidedPermissions ? loadingPermissions : loading

  const categoryIcons: { [key: string]: string } = {
    'Mỹ phẩm': '💄',
    'Điện tử': '📱',
    'Điện lạnh': '❄️',
    'Cao cấp': '💎',
    VIP: '⭐',
  }

  const handleLockedCategory = (event: React.MouseEvent, categoryName: string) => {
    event.preventDefault()
    alert(`Bạn chưa có quyền truy cập khu vực "${categoryName}". Vui lòng liên hệ admin để được cấp quyền.`)
  }

  return (
    <div className="grid grid-cols-5 gap-4 py-6">
      {categories.map((category) => {
        const hasPermission = resolvedPermissions?.includes(category.id) ?? false
        const isLocked = !hasPermission && !isLoadingPermissions

        let discountPercent = 0
        if (category.discount_percent !== null && category.discount_percent !== undefined) {
          const value = category.discount_percent
          if (typeof value === 'number') {
            discountPercent = value
          } else if (typeof value === 'string') {
            const parsed = parseInt(value, 10)
            discountPercent = Number.isNaN(parsed) ? 0 : parsed
          } else {
            const parsed = Number(value)
            discountPercent = Number.isNaN(parsed) ? 0 : Math.floor(parsed)
          }
        }

        if (category.name === 'VIP' && process.env.NODE_ENV === 'development') {
          console.log('VIP Category Debug:', {
            name: category.name,
            id: category.id,
            raw_discount_percent: category.discount_percent,
            parsedDiscountPercent: discountPercent,
            isLocked,
            hasPermission,
          })
        }

        return (
          <div
            key={category.id}
            className={`flex flex-col items-center p-4 bg-white rounded-lg shadow-sm transition-all relative ${
              isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'
            }`}
            onClick={isLocked ? (event) => handleLockedCategory(event, category.name) : undefined}
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
