"use client"
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function UserNav({ user }: { user?: { name?: string | null } | null }) {
  if (!user) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <Button as={Link} href="/auth/signin" variant="outline" size="sm">登入</Button>
        <Button as={Link} href="/auth/signup" size="sm">註冊</Button>
      </div>
    )
  }
  return (
    <div className="ml-auto flex items-center gap-3 text-sm">
      <span className="text-gray-600">Hi，{user.name || '會員'}</span>
      <Button onClick={() => signOut({ callbackUrl: '/' })} variant="ghost" size="sm">登出</Button>
    </div>
  )
}



