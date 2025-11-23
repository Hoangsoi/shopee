'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Banner {
  id: number
  image_url: string
  title: string
  link_url: string | null
}

export default function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    fetchBanners()
  }, [])

  useEffect(() => {
    if (banners.length > 0) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length)
      }, 3000) // Đổi ảnh mỗi 3 giây

      return () => clearInterval(timer)
    }
  }, [banners.length])

  const fetchBanners = async () => {
    try {
      const response = await fetch('/api/banners')
      if (response.ok) {
        const data = await response.json()
        const fetchedBanners = data.banners || []
        if (fetchedBanners.length > 0) {
          setBanners(fetchedBanners)
        } else {
          // Fallback to default banners
          setBanners([
            { id: 1, image_url: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800', title: 'Banner 1', link_url: null },
            { id: 2, image_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800', title: 'Banner 2', link_url: null },
          ])
        }
      }
    } catch (error) {
      console.error('Error fetching banners:', error)
      // Fallback to default banners
      setBanners([
        { id: 1, image_url: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800', title: 'Banner 1', link_url: null },
        { id: 2, image_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800', title: 'Banner 2', link_url: null },
      ])
    }
  }

  if (banners.length === 0) {
    return null
  }

  const BannerContent = ({ banner }: { banner: Banner }) => (
    <div className="min-w-full h-full relative">
      {banner.link_url ? (
        <Link href={banner.link_url} target="_blank" rel="noopener noreferrer">
          <Image
            src={banner.image_url}
            alt={banner.title}
            fill
            className="object-cover cursor-pointer"
            unoptimized
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x300?text=Banner'
            }}
          />
        </Link>
      ) : (
        <Image
          src={banner.image_url}
          alt={banner.title}
          fill
          className="object-cover"
          unoptimized
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x300?text=Banner'
          }}
        />
      )}
    </div>
  )

  return (
    <div className="relative w-full h-48 md:h-64 overflow-hidden bg-gray-200 rounded-lg">
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((banner) => (
          <BannerContent key={banner.id} banner={banner} />
        ))}
      </div>
      
      {/* Dots indicator */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-white w-6' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

