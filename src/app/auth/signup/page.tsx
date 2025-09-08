'use client'
import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function SignUpPage() {
	const searchParams = useSearchParams()
	const inviteToken = searchParams.get('invite')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [err, setErr] = useState<string | null>(null)
	const [tokenValid, setTokenValid] = useState<boolean | null>(null)
	const [showLineTip, setShowLineTip] = useState(false)

	// 檢查邀請 token
	useEffect(() => {
		if (!inviteToken) {
			setTokenValid(false)
			return
		}

		// 驗證 token
		fetch('/api/auth/verify-invite', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ token: inviteToken })
		})
		.then(res => res.json())
		.then(data => {
			setTokenValid(data.valid || false)
			if (!data.valid) {
				setErr('邀請連結無效或已過期')
			}
		})
		.catch(() => {
			setTokenValid(false)
			setErr('驗證邀請連結時發生錯誤')
		})
	}, [inviteToken])

	// 偵測手機 LINE 內建瀏覽器，顯示提示圖
	useEffect(() => {
		const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '') || ''
		const isMobile = /Android|iPhone|iPad|iPod/i.test(ua)
		const isLine = /Line/i.test(ua)
		if (isMobile && isLine && inviteToken) {
			setShowLineTip(true)
		}
	}, [inviteToken])

	async function submit() {
		if (!tokenValid) {
			setErr('需要有效的邀請連結才能註冊')
			return
		}

		setLoading(true)
		setErr(null)
		const res = await fetch('/api/auth/signup', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email, password, inviteToken }),
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

	// 如果沒有邀請 token 或 token 無效，顯示錯誤頁面
	if (tokenValid === false) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow text-center">
					<h1 className="text-2xl font-semibold text-red-600">無法註冊</h1>
					<p className="text-gray-600">需要有效的邀請連結才能註冊帳號</p>
					<p className="text-sm text-gray-500">請聯繫管理員獲取邀請連結</p>
					<Button as={Link} href="/auth/signin" variant="outline" className="w-full">
						返回登入頁
					</Button>
				</div>
			</div>
		)
	}

	// 載入中
	if (tokenValid === null) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow text-center">
					<h1 className="text-2xl font-semibold">驗證邀請連結</h1>
					<p className="text-gray-600">正在驗證邀請連結...</p>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow relative">
				{/* LINE 提示覆蓋層（僅手機 LINE） */}
				{showLineTip && (
					<div className="absolute inset-0 z-10 bg-white">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src="/tips.jpg" alt="提示" className="w-full h-full object-contain" />
						<div className="absolute inset-0 pointer-events-none"></div>
					</div>
				)}
				<div className="text-center space-y-2">
					<h1 className="text-2xl font-semibold">建立帳號</h1>
					<p className="text-sm text-gray-600">可使用 Email 註冊，或使用 Google 快速建立</p>
					<p className="text-xs text-green-600">✓ 邀請連結有效</p>
				</div>
				{err && <div className="text-sm text-red-600 text-center">{err}</div>}
				<div className="space-y-4">
					<label>Email
						<input type="email" inputMode="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
					</label>
					<label>密碼
						<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
					</label>
					<Button disabled={loading} onClick={submit} className="w-full">{loading?'建立中…':'建立帳號'}</Button>
				</div>

				<div className="relative">
					<div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"/></div>
					<div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-gray-500">或</span></div>
				</div>

				<Button
					onClick={() => {
						const params = new URLSearchParams()
						params.set('callbackUrl', '/hall')
						if (inviteToken) params.set('invite', inviteToken)
						signIn('google', { callbackUrl: `/hall?${params.toString()}` })
					}}
					variant="outline"
					className="w-full"
				>
					使用 Google 建立帳號
				</Button>
				<div className="text-center text-sm text-gray-600">已經有帳號了？<Link href="/auth/signin" className="text-blue-600 underline ml-1">前往登入</Link></div>
			</div>
		</div>
	)
}


