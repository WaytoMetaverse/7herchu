'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SignInPage() {
	const router = useRouter()
	const sp = useSearchParams()
	const callbackUrl = sp.get('callbackUrl') || '/hall'
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [err, setErr] = useState<string | null>(null)

	async function doCredentials() {
		setLoading(true)
		setErr(null)
		const res = await signIn('credentials', { email, password, redirect: true, callbackUrl: callbackUrl })
		if (res?.error) setErr(res.error)
		setLoading(false)
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow">
				<div className="text-center space-y-2">
					<h1 className="text-2xl font-semibold">成員登入</h1>
					<p className="text-sm text-gray-600">可使用受邀信箱登入，或以 Google 快速登入</p>
				</div>
				{err && <div className="text-sm text-red-600 text-center">{err}</div>}
				<div className="space-y-3">
					<label className="text-sm block">Email
						<input type="email" inputMode="email" className="mt-1 border rounded w-full px-3 py-2" value={email} onChange={(e)=>setEmail(e.target.value)} />
					</label>
					<label className="text-sm block">密碼
						<input type="password" className="mt-1 border rounded w-full px-3 py-2" value={password} onChange={(e)=>setPassword(e.target.value)} />
					</label>
					<Button disabled={loading} onClick={doCredentials} className="w-full">{loading?'登入中…':'Email 登入'}</Button>
				</div>
				<div className="relative">
					<div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"/></div>
					<div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-gray-500">或</span></div>
				</div>
				<Button onClick={()=>signIn('google',{callbackUrl:callbackUrl})} variant="outline" className="w-full">使用 Google 登入</Button>
				<div className="text-center text-sm text-gray-600">還沒有帳號？<Link href="/auth/signup" className="text-blue-600 underline ml-1">建立帳號</Link></div>
			</div>
		</div>
	)
}
