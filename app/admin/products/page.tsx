'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import ImageUpload from '@/components/ImageUpload'

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
}

interface Category {
  id: number
  name: string
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([]) // Lưu tất cả sản phẩm
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null) // Danh mục được chọn
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    loadCategories()
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      if (res.ok) {
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const loadProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products?page=1&limit=1000')
      const data = await res.json()
      if (res.ok) {
        const allProds = data.products || []
        setAllProducts(allProds)
        // Nếu đã chọn danh mục, lọc ngay
        if (selectedCategoryId) {
          setProducts(allProds.filter((p: Product) => p.category_id === selectedCategoryId))
        } else {
          setProducts(allProds)
        }
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Lọc sản phẩm theo danh mục
  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId)
    if (categoryId === null) {
      // Hiển thị tất cả
      setProducts(allProducts)
    } else {
      // Lọc theo danh mục
      setProducts(allProducts.filter((p) => p.category_id === categoryId))
    }
  }

  // Đếm số sản phẩm trong mỗi danh mục
  const getProductCountByCategory = (categoryId: number | null) => {
    if (categoryId === null) {
      return allProducts.length
    }
    return allProducts.filter((p) => p.category_id === categoryId).length
  }

  const resetForm = () => {
    setFormData({
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
    setEditingId(null)
    setShowAddForm(false)
    setMessage(null)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tên sản phẩm' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          category_id: formData.category_id || null,
          original_price: formData.original_price || null,
          image_url: formData.image_url || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: 'Thêm sản phẩm thành công!' })
        resetForm()
        await loadProducts()
        // Nếu đang lọc theo danh mục, giữ nguyên filter
        if (selectedCategoryId) {
          handleCategorySelect(selectedCategoryId)
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Thêm thất bại' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi kết nối' })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingId(product.id)
    setFormData({
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
    setShowAddForm(false)
  }

  const handleUpdate = async () => {
    if (!editingId || !formData.name.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tên sản phẩm' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: editingId,
          ...formData,
          category_id: formData.category_id || null,
          original_price: formData.original_price || null,
          image_url: formData.image_url || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: 'Cập nhật thành công!' })
        resetForm()
        await loadProducts()
        // Nếu đang lọc theo danh mục, giữ nguyên filter
        if (selectedCategoryId) {
          handleCategorySelect(selectedCategoryId)
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Cập nhật thất bại' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi kết nối' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa sản phẩm này?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: 'Xóa thành công!' })
        await loadProducts()
        // Nếu đang lọc theo danh mục, giữ nguyên filter
        if (selectedCategoryId) {
          handleCategorySelect(selectedCategoryId)
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Xóa thất bại' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi kết nối' })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  const categoryIcons: { [key: string]: string } = {
    'Mỹ phẩm': '💄',
    'Điện tử': '📱',
    'Điện lạnh': '❄️',
    'Cao cấp': '💎',
    'VIP': '⭐',
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#ee4d2d]">Quản lý sản phẩm</h1>
          <button
            onClick={() => {
              resetForm()
              setShowAddForm(true)
            }}
            className="px-4 py-2 bg-[#ee4d2d] text-white rounded-sm hover:bg-[#f05d40]"
          >
            + Thêm sản phẩm
          </button>
        </div>

        {/* Danh sách danh mục để lọc */}
        {categories.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Lọc theo danh mục:</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* Nút "Tất cả" */}
              <button
                onClick={() => handleCategorySelect(null)}
                className={`flex flex-col items-center p-4 rounded-lg shadow-sm transition-all ${
                  selectedCategoryId === null
                    ? 'bg-[#ee4d2d] text-white shadow-md'
                    : 'bg-white hover:shadow-md'
                }`}
              >
                <div className="text-3xl mb-2">📦</div>
                <div className="text-center">
                  <div className="font-semibold text-sm mb-1">Tất cả</div>
                  <div className="text-xs opacity-75">
                    {getProductCountByCategory(null)} sản phẩm
                  </div>
                </div>
              </button>

              {/* Các danh mục */}
              {categories.map((category) => {
                const isSelected = selectedCategoryId === category.id
                const productCount = getProductCountByCategory(category.id)
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className={`flex flex-col items-center p-4 rounded-lg shadow-sm transition-all ${
                      isSelected
                        ? 'bg-[#ee4d2d] text-white shadow-md'
                        : 'bg-white hover:shadow-md'
                    }`}
                  >
                    <div className="text-3xl mb-2">
                      {categoryIcons[category.name] || '📦'}
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-sm mb-1">{category.name}</div>
                      <div className={`text-xs ${isSelected ? 'opacity-90' : 'opacity-75'}`}>
                        {productCount} sản phẩm
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {message && (
          <div
            className={`mb-4 py-3 px-4 rounded-sm ${
              message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
            }`}
          >
            {message.text}
          </div>
        )}

        {(showAddForm || editingId) && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="font-semibold mb-4">{editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
            <form onSubmit={editingId ? (e) => { e.preventDefault(); handleUpdate() } : handleAdd}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Tên sản phẩm *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-sm"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 border rounded-sm"
                    placeholder="auto-generate"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Giá *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-sm"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Giá gốc</label>
                  <input
                    type="number"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-sm"
                    min="0"
                  />
                </div>
                <div className="md:col-span-2">
                  <ImageUpload
                    value={formData.image_url}
                    onChange={(url) => setFormData({ ...formData, image_url: url })}
                    folder="products"
                    label="Ảnh sản phẩm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Danh mục</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-sm"
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
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-sm"
                    min="0"
                  />
                </div>
                <div className="md:col-span-2 flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    />
                    <span className="text-sm">Sản phẩm nổi bật</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <span className="text-sm">Kích hoạt</span>
                  </label>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 text-white rounded-sm hover:bg-green-600 disabled:opacity-50"
                >
                  {loading ? 'Đang xử lý...' : editingId ? 'Cập nhật' : 'Thêm sản phẩm'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-500 text-white rounded-sm hover:bg-gray-600 disabled:opacity-50"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Thông báo danh mục đang chọn */}
        {selectedCategoryId !== null && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              Đang hiển thị sản phẩm của danh mục: <strong>{categories.find(c => c.id === selectedCategoryId)?.name || 'N/A'}</strong>
              {' '}({products.length} sản phẩm)
            </p>
          </div>
        )}

        {loading && products.length === 0 ? (
          <div className="text-center py-8">Đang tải...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8">
            {selectedCategoryId !== null 
              ? `Chưa có sản phẩm nào trong danh mục "${categories.find(c => c.id === selectedCategoryId)?.name || 'N/A'}".`
              : 'Chưa có sản phẩm nào.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left">Ảnh</th>
                  <th className="py-2 px-4 border-b text-left">Tên</th>
                  <th className="py-2 px-4 border-b text-left">Danh mục</th>
                  <th className="py-2 px-4 border-b text-left">Giá</th>
                  <th className="py-2 px-4 border-b text-left">Tồn kho</th>
                  <th className="py-2 px-4 border-b text-left">Trạng thái</th>
                  <th className="py-2 px-4 border-b text-left">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">
                      <div className="relative w-16 h-16 rounded border overflow-hidden bg-gray-100">
                        {product.image_url && 
                         product.image_url.trim() !== '' && 
                         (product.image_url.startsWith('http://') || 
                          product.image_url.startsWith('https://') || 
                          product.image_url.startsWith('data:image/')) ? (
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            className="object-cover"
                            unoptimized
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://via.placeholder.com/60x60?text=${encodeURIComponent(product.name.substring(0, 10))}`
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 text-center p-1">
                            {product.name.substring(0, 10)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-4 border-b">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.slug}</p>
                      </div>
                    </td>
                    <td className="py-2 px-4 border-b">{product.category_name || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">
                      <div>
                        <p className="font-bold text-[#ee4d2d]">{formatCurrency(product.price)}</p>
                        {product.original_price && product.original_price > product.price && (
                          <p className="text-xs text-gray-400 line-through">
                            {formatCurrency(product.original_price)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-4 border-b">{product.stock}</td>
                    <td className="py-2 px-4 border-b">
                      <div className="space-y-1">
                        {product.is_featured && (
                          <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">Nổi bật</span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                          {product.is_active ? 'Hoạt động' : 'Tắt'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4 border-b">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          disabled={loading}
                          className="px-3 py-1 bg-blue-500 text-white rounded-sm hover:bg-blue-600 text-xs disabled:opacity-50"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          disabled={loading}
                          className="px-3 py-1 bg-red-500 text-white rounded-sm hover:bg-red-600 text-xs disabled:opacity-50"
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
