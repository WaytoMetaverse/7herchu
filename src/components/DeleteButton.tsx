'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'

export default function DeleteButton({ 
  url,
  type,
  children, 
  variant = 'danger',
  size = 'sm',
  className = '',
  confirmMessage = '確定要刪除嗎？'
}: {
  url: string
  type: 'photo' | 'card'
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'brand'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  confirmMessage?: string
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm(confirmMessage)) return
    
    setIsDeleting(true)
    try {
      const response = await fetch('/api/profile/delete-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type })
      })
      
      if (!response.ok) {
        throw new Error('刪除失敗')
      }
      
      // 重新載入頁面
      window.location.reload()
    } catch (error) {
      console.error('Delete failed:', error)
      alert('刪除失敗，請稍後再試')
      setIsDeleting(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className={className}
      disabled={isDeleting}
    >
      {isDeleting ? '刪除中...' : children}
    </Button>
  )
}
