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
  const inputRef = useRef<HTMLInputElement>(null)

  // Cập nhật preview khi value thay đổi
  useEffect(() => {
    if (value && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image/'))) {
      setPreview(value)
    } else if (!value) {
      setPreview(null)
    }
  }, [value])

  const handleRemove = () => {
    onChange('')
    setPreview(null)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text')
    
    if (pastedText && pastedText.trim()) {
      const trimmedText = pastedText.trim()
      // Set value ngay lập tức
      onChange(trimmedText)
      
      // Cập nhật preview nếu là URL hoặc base64
      if (trimmedText.startsWith('http://') || trimmedText.startsWith('https://') || trimmedText.startsWith('data:image/')) {
        setPreview(trimmedText)
      } else {
        setPreview(null)
      }
      
      // Đảm bảo input hiển thị giá trị đúng
      if (inputRef.current) {
        inputRef.current.value = trimmedText
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    // Hiển thị preview ngay nếu là URL hoặc base64
    if (newValue && (newValue.startsWith('http://') || newValue.startsWith('https://') || newValue.startsWith('data:image/'))) {
      setPreview(newValue)
    } else if (!newValue) {
      setPreview(null)
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

      {/* URL input - Chỉ cần dán link */}
      <div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Dán URL ảnh vào đây (ví dụ: https://images.unsplash.com/photo-xxx.jpg)"
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900 text-sm"
          style={{ fontSize: '16px' }}
          autoComplete="off"
          spellCheck="false"
        />
        <p className="text-xs text-gray-500 mt-1">
          {value && preview
            ? '✅ URL đã được nhập - Preview hiển thị bên trên'
            : '💡 Copy URL ảnh và dán vào đây (Ctrl+V hoặc Right-click → Paste)'}
        </p>
      </div>
    </div>
  )
}
