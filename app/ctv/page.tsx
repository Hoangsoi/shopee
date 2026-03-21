'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BottomNavigation from '@/components/BottomNavigation'
import ProductThumb from '@/components/ProductThumb'

interface ProposalItem {
  product_id: number
  product_name: string
  product_price: number
  quantity: number
  subtotal: number
  image_url?: string | null
}

interface Proposal {
  id: number
  reference_code: string
  total_amount: number
  estimated_commission: number
  created_at: string
  items: ProposalItem[]
}

export default function CtvPage() {
  const router = useRouter()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/ctv/proposals')
      if (res.status === 401) {
        router.push('/login')
        return
      }
      const data = await res.json()
      if (res.ok) {
        setProposals(data.proposals || [])
      } else {
        setError(data.error || 'Không tải được đề xuất')
      }
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)

  const accept = async (id: number) => {
    if (!confirm('Xác nhận mua đơn này? Tiền sẽ trừ ví và đơn chuyển sang mục Đơn hàng, chờ hệ thống duyệt.')) {
      return
    }
    setActingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/ctv/proposals/${id}/accept`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        await load()
        router.push('/orders')
      } else {
        setError(data.error || 'Không thể xác nhận')
      }
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setActingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] pb-24 flex items-center justify-center">
        <div className="text-lg text-gray-600">Đang tải...</div>
        <BottomNavigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-amber-50 pb-28">
      <div className="container mx-auto px-4 py-4 max-w-4xl">
        <div className="bg-gradient-to-r from-[#ee4d2d] to-[#ff6b4a] rounded-2xl shadow-lg mb-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🤝</span> CTV
              </h1>
              <p className="text-white/90 text-sm mt-1">
                Xem giá và hoa hồng dự kiến, bấm <strong className="text-white">Mua</strong> để xác nhận.
              </p>
            </div>
            <Link
              href="/"
              className="shrink-0 px-3 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30"
            >
              Về trang chủ
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        {proposals.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-600">
            <p className="text-lg mb-1">Chưa có đề xuất nào</p>
            <p className="text-sm">Khi khách hàng mua hàng, bạn sẽ thấy tại đây.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {proposals.map((p) => (
              <li
                key={p.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{p.reference_code}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(p.created_at).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>
                      <span className="text-gray-600">Tổng tiền: </span>
                      <span className="font-bold text-[#ee4d2d]">{formatCurrency(p.total_amount)}</span>
                    </p>
                    <p>
                      <span className="text-gray-600">Hoa hồng dự kiến: </span>
                      <span className="font-semibold text-green-700">
                        {formatCurrency(p.estimated_commission)}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">(Khi đơn được duyệt, theo % danh mục)</p>
                  </div>
                </div>
                <ul className="divide-y divide-gray-50">
                  {p.items.map((it, idx) => (
                    <li
                      key={idx}
                      className="px-4 py-3 flex items-center gap-3 text-sm"
                    >
                      <ProductThumb src={it.image_url} alt={it.product_name} size="lg" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-medium leading-snug">
                          {it.product_name}{' '}
                          <span className="text-gray-500 font-normal">× {it.quantity}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Đơn giá: {formatCurrency(it.product_price)}
                        </p>
                      </div>
                      <span className="font-semibold text-gray-800 shrink-0">
                        {formatCurrency(it.subtotal)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="p-4 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => accept(p.id)}
                    disabled={actingId === p.id}
                    className="w-full py-3 rounded-lg bg-[#ee4d2d] text-white font-bold text-base hover:bg-[#d7321a] disabled:opacity-50 transition-colors"
                  >
                    {actingId === p.id ? 'Đang xử lý...' : 'Mua — Xác nhận đơn'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <BottomNavigation />
    </div>
  )
}
