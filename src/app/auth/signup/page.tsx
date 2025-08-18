'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function SignUpPage() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [err, setErr] = useState<string | null>(null)

	async function submit() {
		setLoading(true)
		setErr(null)
		const res = await fetch('/api/auth/signup', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email, password }),
		})
		const data = await res.json()
		if (!res.ok) {
			setErr(data.error || '註冊失敗')
			setLoading(false)
			return
		}
		// 註冊成功後自動登入
		await signIn('credentials', { email, password, redirect: true, callbackUrl: '/' })
		setLoading(false)
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow">
				<div className="text-center space-y-2">
					<h1 className="text-2xl font-semibold">建立帳號</h1>
					<p className="text-sm text-gray-600">可使用 Email 註冊，或於登入頁使用 Google</p>
				</div>
				{err && <div className="text-sm text-red-600 text-center">{err}</div>}
				<div className="space-y-3">
					<label className="text-sm block">Email
						<input type="email" inputMode="email" className="mt-1 border rounded w-full px-3 py-2" value={email} onChange={(e)=>setEmail(e.target.value)} />
					</label>
					<label className="text-sm block">密碼
						<input type="password" className="mt-1 border rounded w-full px-3 py-2" value={password} onChange={(e)=>setPassword(e.target.value)} />
					</label>
					<button disabled={loading} onClick={submit} className="w-full px-4 py-2 bg-gray-900 text-white rounded">{loading?'建立中…':'建立帳號'}</button>
				</div>
				<div className="text-center text-sm text-gray-600">已經有帳號了？<Link href="/auth/signin" className="text-blue-600 underline ml-1">前往登入</Link></div>
			</div>
		</div>
	)
}


