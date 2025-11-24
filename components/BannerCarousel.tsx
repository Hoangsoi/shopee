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
      }, 3000)

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
        }
      }
    } catch (error) {
      console.error('Error fetching banners:', error)
    }
  }

  if (banners.length === 0) {
    return null
  }

  const BannerContent = ({ banner }: { banner: Banner }) => {
    const isBase64 = banner.image_url.startsWith('data:image/')
    const imageSrc = banner.image_url

    const imageElement = isBase64 ? (
      <img
        src={imageSrc}
        alt={banner.title}
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x300?text=Banner'
        }}
      />
    ) : (
      <Image
        src={imageSrc}
        alt={banner.title}
        fill
        className="object-cover"
        sizes="100vw"
        unoptimized
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x300?text=Banner'
        }}
      />
    )

    return (
      <div className="min-w-full h-full relative">
        {banner.link_url ? (
          <Link href={banner.link_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
            {imageElement}
          </Link>
        ) : (
          imageElement
        )}
      </div>
    )
  }

  return (
    <div className="relative w-full h-48 md:h-64 overflow-hidden bg-gray-200 rounded-lg">
      <div
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((banner) => (
          <BannerContent key={banner.id} banner={banner} />
        ))}
      </div>
      
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
