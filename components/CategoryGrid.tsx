'use client'

import Link from 'next/link'

interface Category {
  id: number
  name: string
  slug: string
  discount_percent: number
  icon?: string
}

interface CategoryGridProps {
  categories: Category[]
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  const categoryIcons: { [key: string]: string } = {
    'Mỹ phẩm': '💄',
    'Điện tử': '📱',
    'Điện lạnh': '❄️',
    'Cao cấp': '💎',
    'VIP': '⭐',
  }

  return (
    <div className="grid grid-cols-5 gap-4 py-6">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/category/${category.slug}`}
          className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="text-4xl mb-2">
            {categoryIcons[category.name] || '📦'}
          </div>
          <div className="text-center">
            <div className="font-semibold text-sm text-gray-800 mb-1">
              {category.name}
            </div>
            {category.discount_percent > 0 && (
              <div className="text-xs text-[#ee4d2d] font-bold">
                Giảm {category.discount_percent}%
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}

