'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value || null)
  const [validating, setValidating] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Validate URL và hiển thị preview tự động
  const validateAndPreviewUrl = useCallback(async (url: string) => {
    if (!url || url.trim() === '') {
      setPreview(null)
      setUrlError(null)
      return
    }

    // Kiểm tra format URL cơ bản
    const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i
    if (!urlPattern.test(url) && !url.startsWith('data:image/')) {
      // Nếu không phải URL ảnh, thử kiểm tra xem có phải URL hợp lệ không
      try {
        new URL(url)
        // URL hợp lệ nhưng không rõ có phải ảnh không, vẫn hiển thị preview
        setPreview(url)
        setUrlError(null)
      } catch {
        setUrlError('URL không hợp lệ')
        setPreview(null)
      }
      return
    }

    setValidating(true)
    setUrlError(null)

    // Kiểm tra ảnh có load được không
    const img = new window.Image()
    img.onload = () => {
      setPreview(url)
      setUrlError(null)
      setValidating(false)
    }
    img.onerror = () => {
      setUrlError('Không thể tải ảnh từ URL này')
      setPreview(null)
      setValidating(false)
    }
    img.src = url
  }, [])

  // Debounce validation khi người dùng nhập
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      if (value && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image/'))) {
        validateAndPreviewUrl(value)
      } else if (value) {
        // Nếu có giá trị nhưng không phải URL, vẫn hiển thị
        setPreview(value)
        setUrlError(null)
      } else {
        setPreview(null)
        setUrlError(null)
      }
    }, 500) // Đợi 500ms sau khi người dùng ngừng gõ

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [value, validateAndPreviewUrl])

  // Cập nhật preview khi value thay đổi từ bên ngoài
  useEffect(() => {
    if (value && value !== preview) {
      setPreview(value)
      setUrlError(null)
    } else if (!value) {
      setPreview(null)
      setUrlError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh quá lớn. Tối đa 5MB')
      return
    }

    setUploading(true)

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string

        // Upload to server
        const response = await fetch('/api/upload/image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64String,
            folder: folder,
            filename: file.name,
          }),
        })

        const data = await response.json()

        if (response.ok && data.url) {
          onChange(data.url)
          setPreview(data.url)
        } else {
          alert(data.error || 'Upload ảnh thất bại')
        }
      }

      reader.onerror = () => {
        alert('Lỗi khi đọc file')
        setUploading(false)
      }

      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Lỗi khi upload ảnh')
    } finally {
      setUploading(false)
    }
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
      {preview && !urlError && (
        <div className="mb-2 relative inline-block">
          <div className="relative w-32 h-32 border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover"
              sizes="128px"
              onError={() => {
                setUrlError('Không thể hiển thị ảnh')
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

      {/* Loading indicator */}
      {validating && (
        <div className="mb-2 text-xs text-blue-600">
          ⏳ Đang kiểm tra URL...
        </div>
      )}

      {/* Error message */}
      {urlError && value && (
        <div className="mb-2 text-xs text-red-600">
          ⚠️ {urlError}
        </div>
      )}

      {/* Upload button */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm"
        >
          {uploading ? 'Đang upload...' : preview ? 'Thay đổi ảnh' : 'Chọn ảnh'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* URL input (fallback) */}
      <div className="mt-2">
        <input
          type="url"
          placeholder="Dán URL ảnh hoặc nhập link (sẽ tự động kiểm tra)"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
          }}
          onPaste={(e) => {
            // Xử lý paste ngay lập tức
            const pastedText = e.clipboardData.getData('text')
            if (pastedText && (pastedText.startsWith('http://') || pastedText.startsWith('https://'))) {
              onChange(pastedText)
            }
          }}
          className={`w-full px-3 py-2 border rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900 text-sm ${
            urlError ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
          style={{ fontSize: '16px' }}
        />
        <p className="text-xs text-gray-500 mt-1">
          {validating 
            ? 'Đang kiểm tra URL...' 
            : urlError 
            ? 'Vui lòng kiểm tra lại URL ảnh' 
            : 'Dán URL ảnh sẽ tự động hiển thị preview'}
        </p>
      </div>
    </div>
  )
}

