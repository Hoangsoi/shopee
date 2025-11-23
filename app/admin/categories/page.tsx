'use client'

import { useState, useEffect, useCallback } from 'react'

interface Category {
  id: number
  name: string
  slug: string
  discount_percent: number
  sort_order: number
  is_active: boolean
  created_at: string
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<Category>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormData, setAddFormData] = useState({
    name: '',
    slug: '',
    discount_percent: 0,
    sort_order: 0,
    is_active: true,
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      } else {
        setMessage({ type: 'error', text: 'Lỗi khi tải danh sách danh mục' })
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi tải danh sách danh mục' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addFormData),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Thêm danh mục thành công!' })
        setShowAddForm(false)
        setAddFormData({
          name: '',
          slug: '',
          discount_percent: 0,
          sort_order: 0,
          is_active: true,
        })
        fetchCategories()
      } else {
        setMessage({ type: 'error', text: data.error || 'Thêm danh mục thất bại' })
      }
    } catch (error) {
      console.error('Error adding category:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi thêm danh mục.' })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setEditFormData({
      name: category.name,
      slug: category.slug,
      discount_percent: category.discount_percent,
      sort_order: category.sort_order,
      is_active: category.is_active,
    })
    setMessage(null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? checked 
        : type === 'number' 
          ? (value === '' ? 0 : parseFloat(value) || 0)
          : value,
    }))
  }

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setAddFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? checked 
        : type === 'number' 
          ? (value === '' ? 0 : parseFloat(value) || 0)
          : value,
    }))
  }

  const handleSave = async () => {
    if (!editingId) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: editingId,
          ...editFormData,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Cập nhật thành công!' })
        setEditingId(null)
        setEditFormData({})
        fetchCategories()
      } else {
        setMessage({ type: 'error', text: data.error || 'Cập nhật thất bại' })
      }
    } catch (error) {
      console.error('Error saving category:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi cập nhật.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (categoryId: number) => {
    if (!confirm('Bạn có chắc muốn xóa danh mục này?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/categories?id=${categoryId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Xóa danh mục thành công!' })
        fetchCategories()
      } else {
        setMessage({ type: 'error', text: data.error || 'Xóa thất bại' })
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi xóa.' })
    } finally {
      setLoading(false)
    }
  }

  if (loading && categories.length === 0) {
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
            <h1 className="text-2xl font-bold text-[#ee4d2d]">Quản lý danh mục</h1>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-[#ee4d2d] text-white rounded-sm hover:bg-[#f05d40] transition-colors text-sm"
            >
              {showAddForm ? 'Hủy' : '+ Thêm danh mục'}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAdd} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-4">Thêm danh mục mới</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Tên danh mục *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={addFormData.name}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Slug *</label>
                  <input
                    type="text"
                    name="slug"
                    required
                    value={addFormData.slug}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                    style={{ fontSize: '16px' }}
                    placeholder="vd: my-pham"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Phần trăm giảm giá (%)</label>
                  <input
                    type="number"
                    name="discount_percent"
                    min="0"
                    max="100"
                    value={addFormData.discount_percent}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                    style={{ fontSize: '16px' }}
                  />
                </div>
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
                <div className="md:col-span-2">
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
              <div className="mt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 text-white rounded-sm hover:bg-green-600 transition-colors text-sm disabled:opacity-50"
                >
                  {loading ? 'Đang thêm...' : 'Thêm danh mục'}
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

          {categories.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              Chưa có danh mục nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">ID</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Tên</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Slug</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Giảm giá (%)</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Thứ tự</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Trạng thái</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b text-sm text-gray-800">{category.id}</td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {editingId === category.id ? (
                          <input
                            type="text"
                            name="name"
                            value={editFormData.name || ''}
                            onChange={handleChange}
                            className="w-full px-2 py-1 border rounded-sm text-sm text-gray-900"
                            style={{ fontSize: '16px' }}
                          />
                        ) : (
                          category.name
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {editingId === category.id ? (
                          <input
                            type="text"
                            name="slug"
                            value={editFormData.slug || ''}
                            onChange={handleChange}
                            className="w-full px-2 py-1 border rounded-sm text-sm text-gray-900"
                            style={{ fontSize: '16px' }}
                          />
                        ) : (
                          category.slug
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {editingId === category.id ? (
                          <input
                            type="number"
                            name="discount_percent"
                            min="0"
                            max="100"
                            value={editFormData.discount_percent || 0}
                            onChange={handleChange}
                            className="w-full px-2 py-1 border rounded-sm text-sm text-gray-900"
                            style={{ fontSize: '16px' }}
                          />
                        ) : (
                          `${category.discount_percent}%`
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {editingId === category.id ? (
                          <input
                            type="number"
                            name="sort_order"
                            value={editFormData.sort_order || 0}
                            onChange={handleChange}
                            className="w-full px-2 py-1 border rounded-sm text-sm text-gray-900"
                            style={{ fontSize: '16px' }}
                          />
                        ) : (
                          category.sort_order
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm">
                        {editingId === category.id ? (
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
                            category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {category.is_active ? 'Hoạt động' : 'Tắt'}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm">
                        {editingId === category.id ? (
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
                              onClick={() => handleEdit(category)}
                              className="px-3 py-1 bg-blue-500 text-white rounded-sm hover:bg-blue-600 transition-colors text-xs"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDelete(category.id)}
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

