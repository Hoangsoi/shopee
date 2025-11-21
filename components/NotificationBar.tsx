'use client'

import { useEffect, useState } from 'react'

export default function NotificationBar() {
  const [notifications, setNotifications] = useState<string[]>([])

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        const contents = data.notifications?.map((n: any) => n.content) || []
        setNotifications(contents.length > 0 ? contents : [
          '🎉 Khuyến mãi đặc biệt - Giảm giá lên đến 50%',
          '🚚 Miễn phí vận chuyển cho đơn hàng trên 500.000đ',
        ])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      // Fallback to default notifications
      setNotifications([
        '🎉 Khuyến mãi đặc biệt - Giảm giá lên đến 50%',
        '🚚 Miễn phí vận chuyển cho đơn hàng trên 500.000đ',
      ])
    }
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="w-full bg-[#ee4d2d] text-white py-2 overflow-hidden relative">
      <div className="flex whitespace-nowrap animate-scroll">
        {[...notifications, ...notifications].map((notif, index) => (
          <span key={index} className="mx-8 text-sm font-medium inline-block">
            {notif}
          </span>
        ))}
      </div>
    </div>
  )
}

