'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  folder?: 'products' | 'banners' | 'categories'
  label?: string
  required?: boolean
}

export default function ImageUpload({
  value,
  onChange,
  folder = 'products',
  label = 'Hình ảnh',
  required = false,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cập nhật preview khi value thay đổi
  useEffect(() => {
    if (value && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image/'))) {
      setPreview(value)
    } else if (!value) {
      setPreview(null)
    }
  }, [value])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh quá lớn. Tối đa 5MB')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Convert to base64 và lưu trực tiếp vào database (không upload lên server)
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      onChange(base64String)
      setPreview(base64String)
    }

    reader.onerror = () => {
      alert('Lỗi khi đọc file')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

    reader.readAsDataURL(file)
  }

  const handleRemove = () => {
    onChange('')
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      {label && (
        <label className="block text-sm text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Preview */}
      {preview && (
        <div className="mb-2 relative inline-block">
          <div className="relative w-32 h-32 border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover"
              sizes="128px"
              unoptimized={preview.startsWith('data:image/')}
              onError={() => {
                setPreview(null)
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload button */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600 transition-colors text-sm"
        >
          {preview ? 'Thay đổi ảnh' : 'Chọn ảnh'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* URL input */}
      <div className="mt-2">
        <input
          type="text"
          placeholder="Dán URL ảnh hoặc nhập link (ví dụ: https://example.com/image.jpg)"
          value={value}
          onChange={(e) => {
            const newValue = e.target.value
            onChange(newValue)
            // Hiển thị preview ngay nếu là URL hoặc base64
            if (newValue && (newValue.startsWith('http://') || newValue.startsWith('https://') || newValue.startsWith('data:image/'))) {
              setPreview(newValue)
            } else if (!newValue) {
              setPreview(null)
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900 text-sm"
          style={{ fontSize: '16px' }}
        />
        <p className="text-xs text-gray-500 mt-1">
          {value && preview
            ? '✅ URL đã được nhập - Preview hiển thị bên trên'
            : '💡 Dán URL ảnh hoặc nhập link trực tiếp'}
        </p>
      </div>
    </div>
  )
}
