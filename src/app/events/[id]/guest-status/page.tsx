'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export default function GuestStatusPage({ params }: { params: Promise<{ id: string }> }) {
	const [eventId, setEventId] = useState('')
	const [registration, setRegistration] = useState<any>(null)
	const [event, setEvent] = useState<any>(null)
	const [loading, setLoading] = useState(true)
	const [err, setErr] = useState<string | null>(null)
	const searchParams = useSearchParams()
	const phone = searchParams.get('phone') || ''

	// 解析 params
	useEffect(() => {
		params.then(p => setEventId(p.id))
	}, [params])

	// 載入報名資訊
	useEffect(() => {
		if (!eventId || !phone) return

		Promise.all([
			fetch(`/api/events?id=${eventId}`).then(res => res.json()),
			fetch(`/api/registrations/search?phone=${encodeURIComponent(phone)}&eventId=${eventId}`).then(res => res.json())
		]).then(([eventData, regData]) => {
			if (eventData?.data) setEvent(eventData.data)
			if (regData?.data && regData.data.length > 0) {
				setRegistration(regData.data[0])
			} else {
				setErr('找不到報名記錄')
			}
			setLoading(false)
		}).catch(() => {
			setErr('載入失敗')
			setLoading(false)
		})
	}, [eventId, phone])

	if (loading) {
		return (
			<div className="max-w-lg mx-auto p-4 space-y-4">
				<div className="text-center">載入中...</div>
			</div>
		)
	}

	if (err || !registration || !event) {
		return (
			<div className="max-w-lg mx-auto p-4 space-y-4">
				<div className="text-center text-red-600">{err || '找不到資料'}</div>
				<div className="text-center">
					<Button as={Link} href="/mobile-query" variant="outline">重新查詢</Button>
				</div>
			</div>
		)
	}

	return (
		<div className="max-w-lg mx-auto p-4 space-y-6">
			<div className="text-center space-y-2">
				<h1 className="text-2xl font-semibold">報名狀況</h1>
				<div className="text-gray-600">
					<div className="font-medium">{event.title}</div>
					<div className="text-sm">
						{format(new Date(event.startAt), 'yyyy/MM/dd（EEEEE） HH:mm', { locale: zhTW })}
					</div>
					<div className="text-sm">{event.location}</div>
				</div>
			</div>

			{/* 報名資訊卡片 */}
			<div className="bg-white rounded-lg border p-4 space-y-3">
				<h2 className="font-medium">您的報名資訊</h2>
				<div className="grid grid-cols-2 gap-3 text-sm">
					<div>
						<span className="text-gray-600">姓名：</span>
						<span className="font-medium">{registration.name}</span>
					</div>
					<div>
						<span className="text-gray-600">身份：</span>
						<span className={`px-2 py-0.5 rounded text-xs ${
							registration.role === 'MEMBER' 
								? 'bg-blue-100 text-blue-700' 
								: 'bg-purple-100 text-purple-700'
						}`}>
							{registration.role === 'MEMBER' ? '內部成員' : '來賓'}
						</span>
					</div>
					<div>
						<span className="text-gray-600">公司：</span>
						<span>{registration.companyName}</span>
					</div>
					<div>
						<span className="text-gray-600">產業：</span>
						<span>{registration.industry}</span>
					</div>
					<div>
						<span className="text-gray-600">菜單：</span>
						<span className="font-medium">選項 {registration.mealCode}</span>
					</div>
					<div>
						<span className="text-gray-600">邀請人：</span>
						<span>{registration.invitedBy}</span>
					</div>
				</div>

				{/* 飲食偏好 */}
				<div className="pt-2 border-t">
					<div className="text-sm text-gray-600 mb-1">飲食偏好：</div>
					<div className="flex gap-2 text-xs">
						<span className={`px-2 py-1 rounded ${registration.diet === 'veg' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
							{registration.diet === 'veg' ? '素食' : '葷食'}
						</span>
						{registration.noBeef && (
							<span className="px-2 py-1 bg-red-100 text-red-600 rounded">不吃牛</span>
						)}
						{registration.noPork && (
							<span className="px-2 py-1 bg-orange-100 text-orange-600 rounded">不吃豬</span>
						)}
					</div>
				</div>
			</div>

			{/* 狀態資訊 */}
			<div className="bg-gray-50 rounded-lg p-4 space-y-2">
				<h3 className="font-medium">活動狀態</h3>
				<div className="grid grid-cols-2 gap-3 text-sm">
					<div className="flex items-center gap-2">
						<span className="text-gray-600">簽到：</span>
						{registration.checkedInAt ? (
							<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">已簽到</span>
						) : (
							<span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">未簽到</span>
						)}
					</div>
					<div className="flex items-center gap-2">
						<span className="text-gray-600">繳費：</span>
						{registration.paymentStatus === 'PAID' ? (
							<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">已繳費</span>
						) : (
							<span className="px-2 py-1 bg-orange-100 text-orange-600 rounded text-xs">未繳費</span>
						)}
					</div>
				</div>
			</div>

			<div className="text-center space-y-3">
				<div className="text-xs text-gray-500">
					報名資訊僅供查詢，如需修改請聯繫邀請人
				</div>
				<div className="flex gap-2 justify-center">
					<Button as={Link} href="/mobile-query" variant="outline">重新查詢</Button>
					<Button as={Link} href="/hall" variant="ghost">活動大廳</Button>
				</div>
			</div>
		</div>
	)
}
