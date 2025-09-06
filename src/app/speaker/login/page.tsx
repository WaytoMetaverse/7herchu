"use client"
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export default function SpeakerPhoneLoginPage() {
	const router = useRouter()
  const sp = useSearchParams()
  const eventId = sp.get('event') || ''
	const [phone, setPhone] = useState('')
	const [err, setErr] = useState<string | null>(null)
	const [bookings, setBookings] = useState<{
		id: string
		eventId: string
		event?: {
			title: string
			startAt: string
		}
	}[]>([])
	const [showSelection, setShowSelection] = useState(false)

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
				if (d) {
					if (Array.isArray(d)) {
						// 多場預約
						if (d.length === 1) {
							// 只有一場，直接跳轉
							const targetEventId = eventId || d[0]?.eventId || ''
							if (targetEventId) {
								router.push(`/speaker/book?event=${encodeURIComponent(targetEventId)}&phone=${encodeURIComponent(v)}&mode=edit`)
							} else {
								router.push('/calendar')
							}
						} else if (d.length > 1) {
							// 多場預約，顯示選單
							setBookings(d)
							setShowSelection(true)
						} else {
							// 沒有預約
							router.push('/calendar')
						}
					} else {
						// 單一預約
						const targetEventId = eventId || d.eventId || ''
						if (targetEventId) {
							router.push(`/speaker/book?event=${encodeURIComponent(targetEventId)}&phone=${encodeURIComponent(v)}&mode=edit`)
						} else {
							router.push('/calendar')
						}
					}
				} else {
					// 沒有預約
					router.push('/calendar')
				}
			})
			.catch(() => router.push('/calendar'))
	}

	function selectBooking(eventId: string) {
		router.push(`/speaker/book?event=${encodeURIComponent(eventId)}&phone=${encodeURIComponent(phone)}&mode=edit`)
	}

	if (showSelection) {
		return (
			<div className="max-w-sm mx-auto p-4 space-y-6">
				<div className="text-center space-y-3">
					<h1 className="text-2xl font-semibold">選擇要編輯的講師預約</h1>
					<p className="text-gray-600">找到 {bookings.length} 筆講師預約記錄，請選擇：</p>
				</div>

				<div className="space-y-3">
					{bookings.map((booking) => (
						<button
							key={booking.id}
							onClick={() => selectBooking(booking.eventId)}
							className="w-full p-4 border rounded-lg text-left hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[60px]"
						>
							<div className="font-medium text-lg mb-1">{booking.event?.title}</div>
							<div className="text-gray-600">
								{booking.event?.startAt ? format(new Date(booking.event.startAt), 'yyyy/MM/dd（EEEEE）', { locale: zhTW }) : '-'}
							</div>
						</button>
					))}
				</div>

				<div className="text-center">
					<Button 
						onClick={() => setShowSelection(false)} 
						variant="outline"
						className="w-full min-h-[44px]"
					>
						返回
					</Button>
				</div>
			</div>
		)
	}

	return (
		<div className="max-w-sm mx-auto p-4 space-y-6">
			<div className="text-center space-y-3">
				<h1 className="text-2xl font-semibold">報名查詢</h1>
				<p className="text-gray-600">請輸入手機號碼查詢您的活動報名記錄</p>
			</div>
			{err && <div className="text-sm text-red-600">{err}</div>}
			<form onSubmit={onSubmit} className="space-y-6">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">手機號碼</label>
					<input
						inputMode="numeric"
						maxLength={10}
						pattern="\d{10}"
						placeholder="請輸入10碼手機號碼"
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
						className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>
				<div className="flex flex-col gap-3">
					<Button type="submit" variant="primary" size="sm" className="w-full min-h-[44px]">送出</Button>
					<Button as={Link} href="/calendar" variant="outline" size="sm" className="w-full min-h-[44px]">取消</Button>
				</div>
			</form>
		</div>
	)
}


