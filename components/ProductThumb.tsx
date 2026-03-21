'use client'

import { useState } from 'react'

type Size = 'sm' | 'md' | 'lg'

const sizeClass: Record<Size, string> = {
  sm: 'w-10 h-10 min-w-[2.5rem]',
  md: 'w-16 h-16 min-w-[4rem]',
  lg: 'w-24 h-24 min-w-[6rem]',
}

export default function ProductThumb({
  src,
  alt,
  size = 'md',
}: {
  src?: string | null
  alt: string
  size?: Size
}) {
  const [broken, setBroken] = useState(false)
  const dim = sizeClass[size]

  if (!src?.trim() || broken) {
    return (
      <div
        className={`${dim} flex shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-100 text-gray-400`}
        aria-hidden
      >
        <span className="text-xl leading-none">🖼</span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL sản phẩm đa nguồn, không cấu hình hết remotePatterns
    <img
      src={src}
      alt={alt}
      className={`${dim} shrink-0 rounded-md border border-gray-200 bg-white object-contain`}
      onError={() => setBroken(true)}
      loading="lazy"
    />
  )
}
