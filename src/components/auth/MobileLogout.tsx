'use client'
import { signOut } from 'next-auth/react'

export default function MobileLogout({ show }: { show: boolean }) {
	if (!show) return null
	return (
		<button onClick={() => signOut({ callbackUrl: '/' })} className="ml-auto text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded">
			登出
		</button>
	)
}
