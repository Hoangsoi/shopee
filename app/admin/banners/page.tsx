'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import ImageUpload from '@/components/ImageUpload'

interface Banner {
  id: number
  image_url: string
  title: string
  link_url: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    image_url: '',
    title: '',
    link_url: '',
    is_active: true,
    sort_order: 0,
  })

  // Load banners
  useEffect(() => {
    loadBanners()
  }, [])

  const loadBanners = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/banners')
      const data = await response.json()
      if (response.ok) {
        setBanners(data.banners || [])
      } else {
        setMessage({ type: 'error', text: data.error || 'Lỗi khi tải danh sách banner' })
      }
    } catch (error) {
      console.error('Error loading banners:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối' })
    } finally {
      setLoading(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      image_url: '',
      title: '',
      link_url: '',
      is_active: true,
      sort_order: 0,
    })
    setEditingId(null)
    setShowAddForm(false)
    setMessage(null)
  }

  // Handle add
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.image_url.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập URL ảnh' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: formData.image_url.trim(),
          title: formData.title.trim() || null,
          link_url: formData.link_url.trim() || null,
          is_active: formData.is_active,
          sort_order: formData.sort_order || 0,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Thêm banner thành công!' })
        resetForm()
        loadBanners()
      } else {
        setMessage({ type: 'error', text: data.error || 'Thêm banner thất bại' })
      }
    } catch (error) {
      console.error('Error adding banner:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối' })
    } finally {
      setLoading(false)
    }
  }

  // Handle edit
  const handleEdit = (banner: Banner) => {
    setEditingId(banner.id)
    setFormData({
      image_url: banner.image_url,
      title: banner.title || '',
      link_url: banner.link_url || '',
      is_active: banner.is_active,
      sort_order: banner.sort_order,
    })
    setShowAddForm(false)
    setMessage(null)
  }

  // Handle update
  const handleUpdate = async () => {
    if (!editingId) return

    if (!formData.image_url.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập URL ảnh' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/banners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banner_id: editingId,
          image_url: formData.image_url.trim(),
          title: formData.title.trim() || null,
          link_url: formData.link_url.trim() || null,
          is_active: formData.is_active,
          sort_order: formData.sort_order || 0,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Cập nhật thành công!' })
        resetForm()
        loadBanners()
      } else {
        setMessage({ type: 'error', text: data.error || 'Cập nhật thất bại' })
      }
    } catch (error) {
      console.error('Error updating banner:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối' })
    } finally {
      setLoading(false)
    }
  }

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa banner này?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/banners?id=${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Xóa banner thành công!' })
        loadBanners()
      } else {
        setMessage({ type: 'error', text: data.error || 'Xóa thất bại' })
      }
    } catch (error) {
      console.error('Error deleting banner:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#ee4d2d]">Quản lý banner</h1>
          <button
            onClick={() => {
              resetForm()
              setShowAddForm(true)
            }}
            className="px-4 py-2 bg-[#ee4d2d] text-white rounded-sm hover:bg-[#f05d40] transition-colors text-sm"
          >
            + Thêm banner
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 py-3 px-4 rounded-sm ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-600'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Add/Edit Form */}
        {(showAddForm || editingId) && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold mb-4">
              {editingId ? 'Sửa banner' : 'Thêm banner mới'}
            </h3>
            <form onSubmit={editingId ? (e) => { e.preventDefault(); handleUpdate() } : handleAdd}>
              <div className="space-y-4">
                {/* Image URL */}
                <div>
                  <ImageUpload
                    value={formData.image_url}
                    onChange={(url) => setFormData({ ...formData, image_url: url })}
                    folder="banners"
                    label="URL ảnh banner"
                    required
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Tiêu đề (tùy chọn)</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                    placeholder="Tiêu đề banner"
                  />
                </div>

                {/* Link URL */}
                <div>
                  <label className="block text-sm text-gray-700 mb-1">URL liên kết (tùy chọn)</label>
                  <input
                    type="url"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                    placeholder="https://example.com"
                  />
                </div>

                {/* Sort order & Active */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Thứ tự</label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Kích hoạt</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Form buttons */}
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 text-white rounded-sm hover:bg-green-600 transition-colors text-sm disabled:opacity-50"
                >
                  {loading ? 'Đang xử lý...' : editingId ? 'Cập nhật' : 'Thêm banner'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-500 text-white rounded-sm hover:bg-gray-600 transition-colors text-sm disabled:opacity-50"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Banners list */}
        {loading && banners.length === 0 ? (
          <div className="text-center py-8 text-gray-600">Đang tải...</div>
        ) : banners.length === 0 ? (
          <div className="text-center py-8 text-gray-600">Chưa có banner nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">ID</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Ảnh</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Tiêu đề</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">URL liên kết</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Thứ tự</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Trạng thái</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((banner) => (
                  <tr key={banner.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b text-sm text-gray-800">{banner.id}</td>
                    <td className="py-2 px-4 border-b text-sm">
                      <div className="relative w-32 h-20 rounded border overflow-hidden">
                        <Image
                          src={banner.image_url}
                          alt={banner.title || 'Banner'}
                          fill
                          className="object-cover"
                          unoptimized
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x100?text=Error'
                          }}
                        />
                      </div>
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-800">{banner.title || 'N/A'}</td>
                    <td className="py-2 px-4 border-b text-sm text-gray-800">
                      {banner.link_url ? (
                        <a
                          href={banner.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline text-xs"
                        >
                          {banner.link_url.length > 30 ? banner.link_url.substring(0, 30) + '...' : banner.link_url}
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-800">{banner.sort_order}</td>
                    <td className="py-2 px-4 border-b text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          banner.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {banner.is_active ? 'Hoạt động' : 'Tắt'}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(banner)}
                          disabled={loading || editingId === banner.id}
                          className="px-3 py-1 bg-blue-500 text-white rounded-sm hover:bg-blue-600 transition-colors text-xs disabled:opacity-50"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(banner.id)}
                          disabled={loading}
                          className="px-3 py-1 bg-red-500 text-white rounded-sm hover:bg-red-600 transition-colors text-xs disabled:opacity-50"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
