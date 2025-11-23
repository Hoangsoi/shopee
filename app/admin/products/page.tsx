'use client'

import { useState, useEffect } from 'react'

interface Product {
  id: number
  name: string
  slug: string
  description?: string
  price: number
  original_price?: number
  image_url?: string
  category_id?: number
  category_name?: string
  is_featured: boolean
  is_active: boolean
  stock: number
  created_at: string
}

interface Category {
  id: number
  name: string
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<Product>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormData, setAddFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: 0,
    original_price: 0,
    image_url: '',
    category_id: 0,
    is_featured: false,
    is_active: true,
    stock: 0,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [])

  useEffect(() => {
    if (searchTerm || selectedCategory) {
      const timeoutId = setTimeout(() => {
        fetchProducts(searchTerm, selectedCategory)
      }, 500)
      return () => clearTimeout(timeoutId)
    } else {
      fetchProducts()
    }
  }, [searchTerm, selectedCategory])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchProducts = async (search?: string, categoryId?: string) => {
    setLoading(true)
    try {
      let url = '/api/admin/products'
      if (categoryId) {
        url += `?category_id=${categoryId}`
      } else if (search) {
        url += `?search=${encodeURIComponent(search)}`
      }
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      } else {
        setMessage({ type: 'error', text: 'Lỗi khi tải danh sách sản phẩm' })
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi tải danh sách sản phẩm' })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...addFormData,
          category_id: addFormData.category_id || null,
          original_price: addFormData.original_price || null,
          image_url: addFormData.image_url || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Thêm sản phẩm thành công!' })
        setShowAddForm(false)
        setAddFormData({
          name: '',
          slug: '',
          description: '',
          price: 0,
          original_price: 0,
          image_url: '',
          category_id: 0,
          is_featured: false,
          is_active: true,
          stock: 0,
        })
        fetchProducts(searchTerm, selectedCategory)
      } else {
        setMessage({ type: 'error', text: data.error || 'Thêm sản phẩm thất bại' })
      }
    } catch (error) {
      console.error('Error adding product:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi thêm sản phẩm.' })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingId(product.id)
    setEditFormData({
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      price: product.price,
      original_price: product.original_price || 0,
      image_url: product.image_url || '',
      category_id: product.category_id || 0,
      is_featured: product.is_featured,
      is_active: product.is_active,
      stock: product.stock,
    })
    setMessage(null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value,
    }))
  }

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setAddFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value,
    }))
  }

  const handleSave = async () => {
    if (!editingId) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: editingId,
          ...editFormData,
          category_id: editFormData.category_id || null,
          original_price: editFormData.original_price || null,
          image_url: editFormData.image_url || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Cập nhật thành công!' })
        setEditingId(null)
        setEditFormData({})
        fetchProducts(searchTerm, selectedCategory)
      } else {
        setMessage({ type: 'error', text: data.error || 'Cập nhật thất bại' })
      }
    } catch (error) {
      console.error('Error saving product:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi cập nhật.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId: number) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/products?id=${productId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Xóa sản phẩm thành công!' })
        fetchProducts(searchTerm, selectedCategory)
      } else {
        setMessage({ type: 'error', text: data.error || 'Xóa thất bại' })
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      setMessage({ type: 'error', text: 'Lỗi kết nối khi xóa.' })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  if (loading && products.length === 0) {
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
            <h1 className="text-2xl font-bold text-[#ee4d2d]">Quản lý sản phẩm</h1>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-[#ee4d2d] text-white rounded-sm hover:bg-[#f05d40] transition-colors text-sm"
            >
              {showAddForm ? 'Hủy' : '+ Thêm sản phẩm'}
            </button>
          </div>

          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
              style={{ fontSize: '16px' }}
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d]"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {showAddForm && (
            <form onSubmit={handleAdd} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-4">Thêm sản phẩm mới</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Tên sản phẩm *</label>
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
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    name="description"
                    value={addFormData.description}
                    onChange={handleAddChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Giá *</label>
                  <input
                    type="number"
                    name="price"
                    required
                    min="0"
                    step="1000"
                    value={addFormData.price}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Giá gốc</label>
                  <input
                    type="number"
                    name="original_price"
                    min="0"
                    step="1000"
                    value={addFormData.original_price}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">URL hình ảnh</label>
                  <input
                    type="url"
                    name="image_url"
                    value={addFormData.image_url}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Danh mục</label>
                  <select
                    name="category_id"
                    value={addFormData.category_id}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d]"
                  >
                    <option value="0">Không có danh mục</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Tồn kho</label>
                  <input
                    type="number"
                    name="stock"
                    min="0"
                    value={addFormData.stock}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <div className="md:col-span-2 flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_featured"
                      checked={addFormData.is_featured}
                      onChange={handleAddChange}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Sản phẩm nổi bật</span>
                  </label>
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
                  {loading ? 'Đang thêm...' : 'Thêm sản phẩm'}
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

          {products.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              {searchTerm || selectedCategory ? 'Không tìm thấy sản phẩm nào.' : 'Chưa có sản phẩm nào.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Hình ảnh</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Tên</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Danh mục</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Giá</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Tồn kho</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Trạng thái</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b">
                        {editingId === product.id ? (
                          <input
                            type="url"
                            name="image_url"
                            value={editFormData.image_url || ''}
                            onChange={handleChange}
                            className="w-32 px-2 py-1 border rounded-sm text-xs text-gray-900"
                            style={{ fontSize: '16px' }}
                            placeholder="URL hình ảnh"
                          />
                        ) : (
                          <img
                            src={product.image_url || 'https://via.placeholder.com/60x60?text=No+Image'}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {editingId === product.id ? (
                          <input
                            type="text"
                            name="name"
                            value={editFormData.name || ''}
                            onChange={handleChange}
                            className="w-full px-2 py-1 border rounded-sm text-sm text-gray-900"
                            style={{ fontSize: '16px' }}
                          />
                        ) : (
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.slug}</p>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {editingId === product.id ? (
                          <select
                            name="category_id"
                            value={editFormData.category_id || 0}
                            onChange={handleChange}
                            className="w-full px-2 py-1 border rounded-sm text-sm"
                          >
                            <option value="0">Không có</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          product.category_name || 'N/A'
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {editingId === product.id ? (
                          <div className="space-y-1">
                            <input
                              type="number"
                              name="price"
                              min="0"
                              step="1000"
                              value={editFormData.price || 0}
                              onChange={handleChange}
                              className="w-full px-2 py-1 border rounded-sm text-xs text-gray-900"
                              style={{ fontSize: '16px' }}
                              placeholder="Giá"
                            />
                            <input
                              type="number"
                              name="original_price"
                              min="0"
                              step="1000"
                              value={editFormData.original_price || 0}
                              onChange={handleChange}
                              className="w-full px-2 py-1 border rounded-sm text-xs text-gray-900"
                              style={{ fontSize: '16px' }}
                              placeholder="Giá gốc"
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="font-bold text-[#ee4d2d]">{formatCurrency(product.price)}</p>
                            {product.original_price && product.original_price > product.price && (
                              <p className="text-xs text-gray-400 line-through">
                                {formatCurrency(product.original_price)}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {editingId === product.id ? (
                          <input
                            type="number"
                            name="stock"
                            min="0"
                            value={editFormData.stock || 0}
                            onChange={handleChange}
                            className="w-full px-2 py-1 border rounded-sm text-sm text-gray-900"
                            style={{ fontSize: '16px' }}
                          />
                        ) : (
                          product.stock
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm">
                        {editingId === product.id ? (
                          <div className="space-y-1">
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                name="is_featured"
                                checked={editFormData.is_featured !== false}
                                onChange={handleChange}
                                className="rounded"
                              />
                              <span className="text-xs">Nổi bật</span>
                            </label>
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                name="is_active"
                                checked={editFormData.is_active !== false}
                                onChange={handleChange}
                                className="rounded"
                              />
                              <span className="text-xs">Kích hoạt</span>
                            </label>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {product.is_featured && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Nổi bật
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {product.is_active ? 'Hoạt động' : 'Tắt'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-sm">
                        {editingId === product.id ? (
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
                              onClick={() => handleEdit(product)}
                              className="px-3 py-1 bg-blue-500 text-white rounded-sm hover:bg-blue-600 transition-colors text-xs"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
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

