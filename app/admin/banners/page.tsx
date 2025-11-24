'use client'

import { useState, useEffect, useCallback } from 'react'
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
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<Banner>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormData, setAddFormData] = useState({
    image_url: '',
    title: '',
    link_url: '',
    is_active: true,
    sort_order: 0,
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchBanners = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/banners')
      if (response.ok) {
        const data = await response.json()
        setBanners(data.banners || [])
      } else {
        setMessage({ type: 'error', text: 'Lỗi khi tải danh sách banner' })
      }
    } catch (error) {
      console.error('Error fetching banners:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi tải danh sách banner' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBanners()
  }, [fetchBanners])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...addFormData,
          link_url: addFormData.link_url || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Thêm banner thành công!' })
        setShowAddForm(false)
        setAddFormData({ image_url: '', title: '', link_url: '', is_active: true, sort_order: 0 })
        fetchBanners()
      } else {
        setMessage({ type: 'error', text: data.error || 'Thêm banner thất bại' })
      }
    } catch (error) {
      console.error('Error adding banner:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi thêm banner.' })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (banner: Banner) => {
    setEditingId(banner.id)
    setEditFormData({
      image_url: banner.image_url,
      title: banner.title,
      link_url: banner.link_url || '',
      is_active: banner.is_active,
      sort_order: banner.sort_order,
    })
    setMessage(null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value,
    }))
  }

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setAddFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value,
    }))
  }

  const handleSave = async () => {
    if (!editingId) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/banners', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          banner_id: editingId,
          ...editFormData,
          link_url: editFormData.link_url || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Cập nhật thành công!' })
        setEditingId(null)
        setEditFormData({})
        fetchBanners()
      } else {
        // Hiển thị lỗi chi tiết nếu có
        const errorMessage = data.details && Array.isArray(data.details) 
          ? data.details.map((d: any) => `${d.field}: ${d.message}`).join(', ')
          : data.error || 'Cập nhật thất bại'
        setMessage({ type: 'error', text: errorMessage })
        console.error('Banner update error:', data)
      }
    } catch (error) {
      console.error('Error saving banner:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi cập nhật.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (bannerId: number) => {
    if (!confirm('Bạn có chắc muốn xóa banner này?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/banners?id=${bannerId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Xóa banner thành công!' })
        fetchBanners()
      } else {
        setMessage({ type: 'error', text: data.error || 'Xóa thất bại' })
      }
    } catch (error) {
      console.error('Error deleting banner:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi xóa.' })
    } finally {
      setLoading(false)
    }
  }

  if (loading && banners.length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-[#ee4d2d]">Quản lý banner</h1>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!confirm('Bạn có chắc muốn migrate tất cả ảnh base64 lên Vercel Blob? (Chỉ migrate ảnh base64, không ảnh hưởng ảnh URL)')) {
                    return
                  }
                  setLoading(true)
                  setMessage(null)
                  try {
                    const response = await fetch('/api/admin/migrate-images-to-blob', {
                      method: 'POST',
                    })
                    const data = await response.json()
                    if (response.ok) {
                      setMessage({
                        type: 'success',
                        text: data.message || 'Migration thành công!',
                      })
                      fetchBanners()
                    } else {
                      setMessage({ type: 'error', text: data.error || 'Migration thất bại' })
                    }
                  } catch (error) {
                    console.error('Migration error:', error)
                    setMessage({ type: 'error', text: 'Lỗi kết nối khi migrate' })
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600 transition-colors text-sm disabled:opacity-50"
              >
                {loading ? 'Đang migrate...' : '🔄 Migrate ảnh lên Blob'}
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-[#ee4d2d] text-white rounded-sm hover:bg-[#f05d40] transition-colors text-sm"
              >
                {showAddForm ? 'Hủy' : '+ Thêm banner'}
              </button>
            </div>
          </div>

          {showAddForm && (
            <form onSubmit={handleAdd} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-4">Thêm banner mới</h3>
              <div className="space-y-4">
                <div>
                  <ImageUpload
                    value={addFormData.image_url}
                    onChange={(url) => setAddFormData({ ...addFormData, image_url: url })}
                    folder="banners"
                    label="Hình ảnh banner"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Tiêu đề</label>
                  <input
                    type="text"
                    name="title"
                    value={addFormData.title}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                    style={{ fontSize: '16px' }}
                    placeholder="Tiêu đề banner"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">URL liên kết (tùy chọn)</label>
                  <input
                    type="url"
                    name="link_url"
                    value={addFormData.link_url}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                    style={{ fontSize: '16px' }}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Thứ tự sắp xếp</label>
                    <input
                      type="number"
                      name="sort_order"
                      value={addFormData.sort_order}
                      onChange={handleAddChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={addFormData.is_active}
                        onChange={handleAddChange}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Kích hoạt</span>
                    </label>
                  </div>
                </div>
                {addFormData.image_url && (
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Xem trước</label>
                    <div className="relative w-full h-48 rounded border border-gray-300 overflow-hidden">
                      <Image
                        src={addFormData.image_url}
                        alt="Preview"
                        fill
                        className="object-cover"
                        unoptimized
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x300?text=Image+Not+Found'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 text-white rounded-sm hover:bg-green-600 transition-colors text-sm disabled:opacity-50"
                >
                  {loading ? 'Đang thêm...' : 'Thêm banner'}
                </button>
              </div>
            </form>
          )}

          {message && (
            <div
              className={`py-3 px-4 rounded-sm mb-4 ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-600'
                  : 'bg-red-50 border border-red-200 text-red-600'
              }`}
            >
              {message.text}
            </div>
          )}

          {banners.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              Chưa có banner nào.
            </div>
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
                        {editingId === banner.id ? (
                          <div className="w-48">
                            <ImageUpload
                              value={editFormData.image_url || ''}
                              onChange={(url) => setEditFormData({ ...editFormData, image_url: url })}
                              folder="banners"
                              label=""
                            />
                          </div>
                        ) : (
                          <div className="relative w-32 h-20 rounded border overflow-hidden">
                            <Image
                              src={banner.image_url}
                              alt={banner.title}
                              fill
                              className="object-cover"
                              unoptimized
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x100?text=Error'
                              }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {editingId === banner.id ? (
                          <input
                            type="text"
                            name="title"
                            value={editFormData.title || ''}
                            onChange={handleChange}
                            className="w-full px-2 py-1 border rounded-sm text-sm text-gray-900"
                            style={{ fontSize: '16px' }}
                          />
                        ) : (
                          banner.title || 'N/A'
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {editingId === banner.id ? (
                          <input
                            type="url"
                            name="link_url"
                            value={editFormData.link_url || ''}
                            onChange={handleChange}
                            className="w-full px-2 py-1 border rounded-sm text-sm text-gray-900"
                            style={{ fontSize: '16px' }}
                            placeholder="URL liên kết"
                          />
                        ) : (
                          banner.link_url ? (
                            <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">
                              {banner.link_url.length > 30 ? banner.link_url.substring(0, 30) + '...' : banner.link_url}
                            </a>
                          ) : 'N/A'
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {editingId === banner.id ? (
                          <input
                            type="number"
                            name="sort_order"
                            value={editFormData.sort_order || 0}
                            onChange={handleChange}
                            className="w-full px-2 py-1 border rounded-sm text-sm text-gray-900"
                            style={{ fontSize: '16px' }}
                          />
                        ) : (
                          banner.sort_order
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm">
                        {editingId === banner.id ? (
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              name="is_active"
                              checked={editFormData.is_active !== false}
                              onChange={handleChange}
                              className="rounded"
                            />
                            <span className="text-xs">Kích hoạt</span>
                          </label>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            banner.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {banner.is_active ? 'Hoạt động' : 'Tắt'}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm">
                        {editingId === banner.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={handleSave}
                              disabled={loading}
                              className="px-3 py-1 bg-green-500 text-white rounded-sm hover:bg-green-600 transition-colors text-xs disabled:opacity-50"
                            >
                              {loading ? 'Đang lưu...' : 'Lưu'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null)
                                setEditFormData({})
                                setMessage(null)
                              }}
                              disabled={loading}
                              className="px-3 py-1 bg-gray-500 text-white rounded-sm hover:bg-gray-600 transition-colors text-xs disabled:opacity-50"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(banner)}
                              className="px-3 py-1 bg-blue-500 text-white rounded-sm hover:bg-blue-600 transition-colors text-xs"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDelete(banner.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded-sm hover:bg-red-600 transition-colors text-xs"
                            >
                              Xóa
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

