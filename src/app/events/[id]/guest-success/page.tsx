import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export default async function GuestSuccessPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams?: Promise<{ phone?: string; updated?: string }> }) {
	const { id: eventId } = await params
	const sp = searchParams ? await searchParams : undefined
	const phone = sp?.phone

	const event = await prisma.event.findUnique({
		where: { id: eventId },
		select: {
			id: true,
			title: true,
			startAt: true,
			endAt: true,
			location: true,
			type: true,
			defaultPriceCents: true,
			guestPriceCents: true,
			bodGuestPriceCents: true,
		}
	})
	if (!event) notFound()

	// 與「來賓邀請」一致：伺服端預先格式化避免時區跳動
	const eventDateLabel = format(event.startAt, 'yyyy/MM/dd（EEEEE）', { locale: zhTW })
	const eventTimeLabel = `${format(event.startAt, 'HH:mm', { locale: zhTW })}-${format(event.endAt, 'HH:mm', { locale: zhTW })}`

	// 計算來賓金額（沿用原規則與顯示）
	const guestPriceLabel: string = (() => {
		switch (event!.type) {
			case 'GENERAL':
			case 'JOINT':
			case 'CLOSED':
				return 'NT$ 250'
			case 'BOD':
				return event!.bodGuestPriceCents ? `NT$ ${event!.bodGuestPriceCents / 100}` : '-'
			case 'DINNER':
			case 'SOFT':
			case 'VISIT':
				return event!.guestPriceCents ? `NT$ ${event!.guestPriceCents / 100}` : (event!.defaultPriceCents ? `NT$ ${event!.defaultPriceCents / 100}` : '-')
			default:
				return '-'
		}
	})()

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
					<div>🗓️ {eventDateLabel} {eventTimeLabel}</div>
					<div>📍 {event.location}</div>
					<div>💰 活動費用：{guestPriceLabel}</div>
				</div>
			</div>

			{/* 重要提醒 */}
			<div className="bg-blue-50 rounded-lg p-4 space-y-2">
				<h3 className="font-medium text-blue-900">重要提醒</h3>
				<div className="text-sm text-blue-700 space-y-2">
					<div>✓ 請匯款至帳號：中國信託822 城中分行 107540665031或匯款或line pay給您的邀約人</div>
					<div>✓ 下班時段易塞車請注意交通安全，以確保準時蒞臨與會</div>
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
