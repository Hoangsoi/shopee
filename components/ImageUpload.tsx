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
      setValidating(false)
      return
    }

    const trimmedUrl = url.trim()

    // Nếu là data URL, hiển thị ngay
    if (trimmedUrl.startsWith('data:image/')) {
      setPreview(trimmedUrl)
      setUrlError(null)
      setValidating(false)
      return
    }

    // Kiểm tra xem có phải URL hợp lệ không
    let isValidUrl = false
    try {
      new URL(trimmedUrl)
      isValidUrl = true
    } catch {
      setUrlError('URL không hợp lệ')
      setPreview(null)
      setValidating(false)
      return
    }

    // Nếu là URL hợp lệ, kiểm tra xem có phải ảnh không
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i
    const isImageUrl = imageExtensions.test(trimmedUrl) || trimmedUrl.includes('image') || trimmedUrl.includes('photo')

    setValidating(true)
    setUrlError(null)

    // Kiểm tra ảnh có load được không
    const img = new window.Image()
    const timeout = setTimeout(() => {
      setUrlError('Timeout: Không thể tải ảnh (có thể do CORS hoặc URL không đúng)')
      setPreview(null)
      setValidating(false)
    }, 10000) // 10 giây timeout

    img.onload = () => {
      clearTimeout(timeout)
      setPreview(trimmedUrl)
      setUrlError(null)
      setValidating(false)
    }
    img.onerror = () => {
      clearTimeout(timeout)
      // Nếu URL hợp lệ nhưng không load được, vẫn hiển thị (có thể do CORS)
      if (isImageUrl) {
        setPreview(trimmedUrl)
        setUrlError('⚠️ Không thể verify ảnh (có thể do CORS), nhưng URL có vẻ hợp lệ')
      } else {
        setUrlError('Không thể tải ảnh từ URL này')
        setPreview(null)
      }
      setValidating(false)
    }
    img.src = trimmedUrl
  }, [])

  // Debounce validation khi người dùng nhập (chỉ khi không phải paste)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!value || value.trim() === '') {
      setPreview(null)
      setUrlError(null)
      setValidating(false)
      return
    }

    const trimmedValue = value.trim()
    
    // Chỉ validate nếu là URL
    if (trimmedValue.startsWith('http://') || trimmedValue.startsWith('https://') || trimmedValue.startsWith('data:image/')) {
      // Debounce validation (trừ khi đang validating - đã được trigger bởi paste/Enter)
      if (!validating) {
        debounceTimerRef.current = setTimeout(() => {
          validateAndPreviewUrl(trimmedValue)
        }, 1000) // Đợi 1 giây sau khi người dùng ngừng gõ
      }
    } else if (trimmedValue) {
      // Nếu có giá trị nhưng không phải URL, clear preview
      setPreview(null)
      setUrlError('Vui lòng nhập URL ảnh hợp lệ (bắt đầu bằng http:// hoặc https://)')
      setValidating(false)
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [value, validateAndPreviewUrl, validating])

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
          // Nếu có fallback_url, sử dụng nó
          if (data.fallback_url) {
            onChange(data.fallback_url)
            setPreview(data.fallback_url)
          } else {
            alert(data.error || 'Upload ảnh thất bại')
          }
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
          type="text"
          placeholder="Dán URL ảnh hoặc nhập link (sẽ tự động kiểm tra)"
          value={value}
          onChange={(e) => {
            const newValue = e.target.value
            onChange(newValue)
          }}
          onPaste={(e) => {
            // Lấy text đã paste
            const pastedText = e.clipboardData.getData('text').trim()
            
            if (pastedText) {
              // Clear debounce timer trước
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
                debounceTimerRef.current = null
              }
              
              // Set giá trị ngay
              onChange(pastedText)
              
              // Nếu là URL, validate ngay lập tức (không đợi debounce)
              if (pastedText.startsWith('http://') || pastedText.startsWith('https://') || pastedText.startsWith('data:image/')) {
                // Validate ngay sau khi state update
                requestAnimationFrame(() => {
                  validateAndPreviewUrl(pastedText)
                })
              }
            }
          }}
          onKeyDown={(e) => {
            // Trigger validation khi nhấn Enter
            if (e.key === 'Enter') {
              e.preventDefault()
              if (value && value.trim()) {
                const trimmedValue = value.trim()
                onChange(trimmedValue)
                // Clear debounce timer
                if (debounceTimerRef.current) {
                  clearTimeout(debounceTimerRef.current)
                  debounceTimerRef.current = null
                }
                validateAndPreviewUrl(trimmedValue)
              }
            }
          }}
          onBlur={() => {
            // Trim khi blur
            if (value && value !== value.trim()) {
              const trimmedValue = value.trim()
              onChange(trimmedValue)
            }
          }}
          className={`w-full px-3 py-2 border rounded-sm focus:outline-none focus:border-[#ee4d2d] text-gray-900 text-sm ${
            urlError ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
          style={{ fontSize: '16px' }}
        />
        <p className="text-xs text-gray-500 mt-1">
          {validating 
            ? '⏳ Đang kiểm tra URL...' 
            : urlError 
            ? `⚠️ ${urlError}` 
            : value && preview && !urlError
            ? '✅ URL hợp lệ - Preview đã hiển thị'
            : value
            ? '💡 Đang chờ kiểm tra... (hoặc nhấn Enter để kiểm tra ngay)'
            : '💡 Dán URL ảnh sẽ tự động hiển thị preview'}
        </p>
      </div>
    </div>
  )
}

