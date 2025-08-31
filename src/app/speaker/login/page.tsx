"use client"
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function SpeakerPhoneLoginPage() {
	const router = useRouter()
  const sp = useSearchParams()
  const eventId = sp.get('event') || ''
	const [phone, setPhone] = useState('')
	const [err, setErr] = useState<string | null>(null)

	function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		const v = phone.trim()
		if (!/^\d{10}$/.test(v)) {
			setErr('請輸入10碼手機號碼')
			return
		}
		// 查詢既有預約
		fetch(`/api/speaker/booking?phone=${encodeURIComponent(v)}${eventId ? `&eventId=${encodeURIComponent(eventId)}` : ''}`)
			.then(res => res.json())
			.then(data => {
				const d = data?.data
				let targetEventId = ''
				if (d) {
					if (Array.isArray(d)) {
						targetEventId = d[0]?.eventId || ''
					} else {
						targetEventId = d.eventId || ''
					}
				}
				if (eventId) targetEventId = eventId
				if (targetEventId) {
					router.push(`/speaker/book?event=${encodeURIComponent(targetEventId)}&phone=${encodeURIComponent(v)}&mode=edit`)
				} else {
					router.push('/calendar')
				}
			})
			.catch(() => router.push('/calendar'))
	}

	return (
		<div className="max-w-sm mx-auto p-4 space-y-4">
			<h1 className="text-xl font-semibold">報名查詢</h1>
			{err && <div className="text-sm text-red-600">{err}</div>}
			<form onSubmit={onSubmit} className="space-y-4">
				<label>手機號碼
					<input
						inputMode="numeric"
						maxLength={10}
						pattern="\d{10}"
						placeholder="請輸入10碼手機號碼"
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
					/>
				</label>
				<div className="flex items-center gap-3">
					<Button type="submit" className="bg-[var(--brand-600)] hover:bg-[var(--brand-700)] text-white text-sm px-3 py-1 rounded-md">送出</Button>
					<Button as={Link} href="/calendar" className="bg-white border-2 border-gray-800 text-gray-900 hover:bg-gray-50 text-sm px-3 py-1 rounded-md font-medium">取消</Button>
				</div>
			</form>
		</div>
	)
}


