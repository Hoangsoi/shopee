import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'

import sql from '@/lib/db'
import { getPublicCacheHeaders } from '@/lib/http-cache'
import { getInvestmentRateByDays } from '@/lib/investment-utils'

async function fetchInvestmentRates() {
  return sql`
    SELECT value, updated_at
    FROM settings
    WHERE key = 'investment_rates_by_days'
      AND updated_at = (
        SELECT MAX(updated_at)
        FROM settings
        WHERE key = 'investment_rates_by_days'
      )
    LIMIT 1
  `
}

const getCachedInvestmentRates = unstable_cache(
  fetchInvestmentRates,
  ['investment-rates'],
  {
    revalidate: 300,
    tags: ['investment-rates'],
  }
)

export async function GET(request: NextRequest) {
  try {
    const result = await getCachedInvestmentRates()

    let rates = [
      { min_days: 1, max_days: 6, rate: 1.0 },
      { min_days: 7, max_days: 14, rate: 2.0 },
      { min_days: 15, max_days: 29, rate: 3.0 },
      { min_days: 30, rate: 5.0 },
    ]

    if (result.length > 0) {
      try {
        const parsed = JSON.parse(result[0].value)
        if (Array.isArray(parsed) && parsed.length > 0) {
          rates = parsed
        }
      } catch {
        // Keep fallback defaults when stored JSON is invalid.
      }
    }

    const { searchParams } = new URL(request.url)
    const daysParam = searchParams.get('days')

    if (daysParam) {
      const days = parseInt(daysParam, 10)
      if (!Number.isNaN(days) && days > 0) {
        const dailyProfitRate = getInvestmentRateByDays(days, rates)

        return NextResponse.json(
          {
            days,
            daily_profit_rate: dailyProfitRate,
            rates,
          },
          {
            headers: getPublicCacheHeaders(300, 600),
          }
        )
      }
    }

    return NextResponse.json(
      {
        rates,
        daily_profit_rate: rates[0]?.rate || 1.0,
      },
      {
        headers: getPublicCacheHeaders(300, 600),
      }
    )
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get investment rate error:', error)
    }

    return NextResponse.json(
      { error: 'Lỗi khi lấy tỷ lệ lợi nhuận' },
      { status: 500 }
    )
  }
}
