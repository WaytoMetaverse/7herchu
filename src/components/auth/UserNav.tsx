"use client"
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { getDisplayName } from '@/lib/displayName'

export default function UserNav({ user }: { user?: { name?: string | null; nickname?: string | null } | null }) {
  if (!user) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <Button as={Link} href="/auth/signin" variant="outline" size="sm">登入</Button>
        <Button as={Link} href="/auth/signup" size="sm">註冊</Button>
      </div>
    )
  }
  const display = getDisplayName(user)
  return (
    <div className="ml-auto flex items-center gap-3 text-sm">
      <Link href="/profile" className="text-gray-900 hover:text黑 font-medium">{display}</Link>
      <Button onClick={() => signOut({ callbackUrl: '/' })} variant="ghost" size="sm">登出</Button>
    </div>
  )
}



