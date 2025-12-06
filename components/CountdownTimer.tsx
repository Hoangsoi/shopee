'use client'

import { useState, useEffect } from 'react'

interface CountdownTimerProps {
  targetDate: string | Date
  onComplete?: () => void
}

export default function CountdownTimer({ targetDate, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const target = new Date(targetDate).getTime()

    const updateTimer = () => {
      const now = new Date().getTime()
      const difference = target - now

      if (difference <= 0) {
        setIsExpired(true)
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        if (onComplete) {
          onComplete()
        }
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds })
      setIsExpired(false)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [targetDate, onComplete])

  if (timeLeft === null) {
    return (
      <div className="text-sm text-gray-500">Đang tính toán...</div>
    )
  }

  if (isExpired) {
    return (
      <div className="text-sm font-semibold text-green-600">
        🎉 Đã đến thời gian mở thưởng!
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1">
        <span className="font-semibold text-gray-700">{timeLeft.days}</span>
        <span className="text-gray-500 text-xs">ngày</span>
      </div>
      <span className="text-gray-400">:</span>
      <div className="flex items-center gap-1">
        <span className="font-semibold text-gray-700">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="text-gray-500 text-xs">giờ</span>
      </div>
      <span className="text-gray-400">:</span>
      <div className="flex items-center gap-1">
        <span className="font-semibold text-gray-700">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-gray-500 text-xs">phút</span>
      </div>
      <span className="text-gray-400">:</span>
      <div className="flex items-center gap-1">
        <span className="font-semibold text-gray-700">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="text-gray-500 text-xs">giây</span>
      </div>
    </div>
  )
}
