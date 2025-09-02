'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export default function GuestSuccessPage({ params }: { params: Promise<{ id: string }> }) {
	const [eventId, setEventId] = useState('')
	const [event, setEvent] = useState<{
		id: string
		title: string
		startAt: string
		location: string
	} | null>(null)
	const searchParams = useSearchParams()
	const phone = searchParams.get('phone')

	// 解析 params
	useEffect(() => {
		params.then(p => setEventId(p.id))
	}, [params])

	// 載入活動資訊
	useEffect(() => {
		if (!eventId) return
		
		fetch(`/api/events?id=${eventId}`)
			.then(res => res.json())
			.then(data => {
				if (data?.data) setEvent(data.data)
			})
			.catch(() => {
				// 錯誤處理
			})
	}, [eventId])

	if (!event) {
		return (
			<div className="max-w-lg mx-auto p-4 space-y-4">
				<div className="text-center">載入中...</div>
			</div>
		)
	}

	return (
		<div className="max-w-lg mx-auto p-4 space-y-6">
			{/* 成功圖示 */}
			<div className="text-center">
				<div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
					<svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<h1 className="text-2xl font-semibold text-green-600">報名成功！</h1>
			</div>

			{/* 活動資訊 */}
			<div className="bg-gray-50 rounded-lg p-4 space-y-2">
				<h2 className="font-medium text-gray-900">活動資訊</h2>
				<div className="text-sm text-gray-600 space-y-1">
					<div>📅 {event.title}</div>
					<div>🗓️ {format(new Date(event.startAt), 'yyyy/MM/dd（EEEEE） HH:mm', { locale: zhTW })}</div>
					<div>📍 {event.location}</div>
				</div>
			</div>

			{/* 提醒訊息 */}
			<div className="bg-blue-50 rounded-lg p-4 space-y-2">
				<h3 className="font-medium text-blue-900">重要提醒</h3>
				<div className="text-sm text-blue-700 space-y-1">
					<div>✓ 我們會在活動前與您聯繫</div>
					<div>✓ 請準時出席活動</div>
					{phone && <div>✓ 您的報名手機：{phone}</div>}
				</div>
			</div>

			{/* 操作按鈕 */}
			<div className="space-y-3">
				{phone ? (
					<Button 
						as={Link} 
						href={`/events/${eventId}/guest-status?phone=${encodeURIComponent(phone)}`}
						variant="primary"
						className="w-full"
					>
						查看報名詳情
					</Button>
				) : (
					<Button 
						as={Link} 
						href="/mobile-query"
						variant="primary"
						className="w-full"
					>
						查詢報名狀態
					</Button>
				)}
				
				<Button 
					as={Link} 
					href={`/events/${eventId}/guest-register`}
					variant="outline"
					className="w-full"
				>
					替其他人報名
				</Button>
			</div>

			{/* 底部說明 */}
			<div className="text-xs text-gray-500 text-center space-y-1">
				<div>如需修改報名資料或取消報名</div>
				<div>請聯繫活動主辦單位</div>
				<div className="mt-2">
					<Link href="/mobile-query" className="text-blue-600 underline">
						使用手機號碼查詢報名
					</Link>
				</div>
			</div>
		</div>
	)
}
