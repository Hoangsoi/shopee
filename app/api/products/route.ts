import { NextRequest, NextResponse } from 'next/server'

import sql from '@/lib/db'
import { getPublicCacheHeaders } from '@/lib/http-cache'
import type { Product } from '@/lib/types'

let productColumnsEnsured = false

async function ensureProductColumnsOnce(): Promise<void> {
  if (productColumnsEnsured) {
    return
  }

  try {
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'products'
        AND column_name IN ('sales_count', 'rating')
    `

    const existingColumns = columns.map((column: Record<string, unknown>) =>
      String(column.column_name)
    )

    if (!existingColumns.includes('sales_count')) {
      await sql`ALTER TABLE products ADD COLUMN sales_count INTEGER DEFAULT 0`
    }

    if (!existingColumns.includes('rating')) {
      await sql`ALTER TABLE products ADD COLUMN rating DECIMAL(3, 2) DEFAULT 0`
    }

    productColumnsEnsured = true
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.log('ensureProductColumnsOnce:', error instanceof Error ? error.message : error)
    }
  }
}

function seededRandom(seed: number): number {
  const value = Math.sin(seed) * 10000
  return value - Math.floor(value)
}

function generateRandomSalesCount(productId: number): number {
  return Math.floor(50 + seededRandom(productId) * 450)
}

function generateRandomRating(productId: number): number {
  return Math.round((3.5 + seededRandom(productId + 1000) * 1.5) * 10) / 10
}

async function getSalesBoostConfig() {
  const config = { value: 0, interval_hours: 0, updated_at: null as Date | null }

  try {
    const setting = await sql`
      SELECT value, updated_at
      FROM settings
      WHERE key = 'sales_boost'
      LIMIT 1
    `

    if (setting.length === 0) {
      return config
    }

    try {
      const parsed = JSON.parse(setting[0].value)
      config.value = parsed.value || 0
      config.interval_hours = parsed.interval_hours || 0
    } catch {
      config.value = parseInt(setting[0].value, 10) || 0
      config.interval_hours = 0
    }

    config.updated_at = setting[0].updated_at ? new Date(setting[0].updated_at) : null
  } catch {
    return config
  }

  return config
}

function getCurrentBoostValue(config: {
  value: number
  interval_hours: number
  updated_at: Date | null
}) {
  if (config.value <= 0 || !config.updated_at) {
    return 0
  }

  if (config.interval_hours <= 0) {
    return config.value
  }

  const hoursSinceUpdate = (Date.now() - config.updated_at.getTime()) / (1000 * 60 * 60)
  const intervalsPassed = Math.floor(hoursSinceUpdate / config.interval_hours)

  return intervalsPassed * config.value
}

function mapProducts(rows: any[], currentBoost: number): Product[] {
  return rows.map((product): Product => {
    const baseSalesCount = generateRandomSalesCount(product.id)
    const salesCount = baseSalesCount + currentBoost

    let rating = product.rating ? parseFloat(product.rating.toString()) : 0
    if (rating === 0) {
      rating = generateRandomRating(product.id)
    }

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: parseFloat(product.price.toString()),
      original_price: product.original_price
        ? parseFloat(product.original_price.toString())
        : undefined,
      image_url: product.image_url,
      category_id: product.category_id,
      category_name: product.category_name,
      discount_percent: product.category_discount_percent
        ? parseInt(product.category_discount_percent.toString(), 10)
        : 0,
      is_featured: product.is_featured,
      is_active: product.is_active,
      stock: product.stock ? parseInt(product.stock.toString(), 10) : 0,
      sales_count: salesCount,
      rating,
      created_at: product.created_at,
      updated_at: product.updated_at,
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    await ensureProductColumnsOnce()

    const searchParams = request.nextUrl.searchParams
    const categoryId = searchParams.get('category_id')
    const featured = searchParams.get('featured')
    const categoryIds = Array.from(
      new Set(
        (searchParams.get('category_ids') || '')
          .split(',')
          .map((value) => parseInt(value.trim(), 10))
          .filter((value) => Number.isInteger(value) && value > 0)
      )
    )

    let query

    if (categoryId) {
      query = sql`
        SELECT
          p.id,
          p.name,
          p.slug,
          p.price,
          p.original_price,
          p.image_url,
          p.category_id,
          p.is_featured,
          p.is_active,
          p.stock,
          p.sales_count,
          p.rating,
          p.created_at,
          p.updated_at,
          c.name as category_name,
          c.discount_percent as category_discount_percent
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.category_id = ${parseInt(categoryId, 10)}
          AND p.category_id IS NOT NULL
          AND p.is_active = true
          AND c.id IS NOT NULL
        ORDER BY p.created_at DESC
        LIMIT 100
      `
    } else if (categoryIds.length > 0) {
      const categoryIdsCsv = categoryIds.join(',')

      query = sql`
        WITH ranked_products AS (
          SELECT
            p.id,
            p.name,
            p.slug,
            p.price,
            p.original_price,
            p.image_url,
            p.category_id,
            p.is_featured,
            p.is_active,
            p.stock,
            p.sales_count,
            p.rating,
            p.created_at,
            p.updated_at,
            c.name as category_name,
            c.discount_percent as category_discount_percent,
            ROW_NUMBER() OVER (
              PARTITION BY p.category_id
              ORDER BY p.created_at DESC
            ) as row_number
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.category_id = ANY(string_to_array(${categoryIdsCsv}, ',')::int[])
            AND p.category_id IS NOT NULL
            AND p.is_active = true
            AND c.id IS NOT NULL
        )
        SELECT
          id,
          name,
          slug,
          price,
          original_price,
          image_url,
          category_id,
          is_featured,
          is_active,
          stock,
          sales_count,
          rating,
          created_at,
          updated_at,
          category_name,
          category_discount_percent
        FROM ranked_products
        WHERE row_number <= 100
        ORDER BY category_id ASC, created_at DESC
      `
    } else if (featured === 'true') {
      query = sql`
        SELECT
          p.id,
          p.name,
          p.slug,
          p.price,
          p.original_price,
          p.image_url,
          p.category_id,
          p.is_featured,
          p.is_active,
          p.stock,
          p.sales_count,
          p.rating,
          p.created_at,
          p.updated_at,
          c.name as category_name,
          c.discount_percent as category_discount_percent
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_featured = true AND p.is_active = true
        ORDER BY p.created_at DESC
        LIMIT 20
      `
    } else {
      query = sql`
        SELECT
          p.id,
          p.name,
          p.slug,
          p.price,
          p.original_price,
          p.image_url,
          p.category_id,
          p.is_featured,
          p.is_active,
          p.stock,
          p.sales_count,
          p.rating,
          p.created_at,
          p.updated_at,
          c.name as category_name,
          c.discount_percent as category_discount_percent
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = true
        ORDER BY p.created_at DESC
        LIMIT 20
      `
    }

    const [products, salesBoostConfig] = await Promise.all([query, getSalesBoostConfig()])
    const currentBoost = getCurrentBoostValue(salesBoostConfig)

    return NextResponse.json(
      {
        products: mapProducts(products, currentBoost),
      },
      {
        headers: getPublicCacheHeaders(120, 300),
      }
    )
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get products error:', error)
    }

    return NextResponse.json(
      { error: 'Lỗi khi lấy sản phẩm' },
      { status: 500 }
    )
  }
}
