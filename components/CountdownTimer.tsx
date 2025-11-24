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

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Parse target date (from database, stored as UTC)
      const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate
      
      // Get current time (server/client time)
      const now = new Date()
      
      // Calculate difference (both are in same timezone context)
      const difference = target.getTime() - now.getTime()

      if (difference <= 0) {
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
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [targetDate, onComplete])

  if (!timeLeft) {
    return <span className="text-xs text-white/80">Đang tính...</span>
  }

  if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
    return <span className="text-xs text-white/80">Đã đến hạn</span>
  }

  return (
    <div className="flex items-center gap-1 text-xs text-white/90">
      <span className="font-semibold">⏰</span>
      {timeLeft.days > 0 && (
        <span>
          <span className="font-bold">{timeLeft.days}</span>d
        </span>
      )}
      <span>
        <span className="font-bold">{String(timeLeft.hours).padStart(2, '0')}</span>:
        <span className="font-bold">{String(timeLeft.minutes).padStart(2, '0')}</span>:
        <span className="font-bold">{String(timeLeft.seconds).padStart(2, '0')}</span>
      </span>
    </div>
  )
}

