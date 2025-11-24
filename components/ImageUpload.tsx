'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [uploading, setUploading] = useState(false)
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

    setUploading(true)

    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      onChange(base64String)
      setPreview(base64String)
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

    reader.onerror = () => {
      alert('Lỗi khi đọc file')
      setUploading(false)
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
    <div className="w-full">
      {label && (
        <label className="block text-sm text-gray-700 mb-2 font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Preview */}
      {preview && (
        <div className="mb-3 relative inline-block">
          <div className="relative w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100 shadow-sm">
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
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 shadow-md z-10"
            aria-label="Xóa ảnh"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload Section - CHỈ CÓ BUTTON UPLOAD, KHÔNG CÓ INPUT TEXT */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.click()
            }
          }}
          disabled={uploading}
          className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600 active:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          style={{ 
            display: 'inline-block',
            minWidth: '120px',
            textAlign: 'center'
          }}
        >
          {uploading ? (
            <>
              <span className="mr-2">⏳</span>
              <span>Đang tải...</span>
            </>
          ) : preview ? (
            <>
              <span className="mr-2">🔄</span>
              <span>Thay đổi ảnh</span>
            </>
          ) : (
            <>
              <span className="mr-2">📁</span>
              <span>Chọn ảnh</span>
            </>
          )}
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ 
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0
          }}
          aria-label="Chọn file ảnh"
        />
        
        <p className="text-xs text-gray-500 mt-2">
          {uploading
            ? '⏳ Đang xử lý ảnh...'
            : preview
            ? '✅ Ảnh đã được tải lên thành công'
            : '💡 Click "Chọn ảnh" để upload file từ máy tính (JPG, PNG, GIF - tối đa 5MB)'}
        </p>
      </div>
    </div>
  )
}
