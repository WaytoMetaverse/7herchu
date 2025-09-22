import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import GuestRegisterClient from './GuestRegisterClient'
import { unstable_noStore as noStore } from 'next/cache'

export default async function GuestRegisterPage({ params }: { params: Promise<{ id: string }> }) {
	// 禁用快取，確保邀請卡更新能即時反映
	noStore()
	
	const { id: eventId } = await params
	
	// 檢查活動是否存在
	const [event, orgSettings] = await Promise.all([
		prisma.event.findUnique({ where: { id: eventId } }),
		prisma.orgSettings.findFirst()
	])
	
	if (!event) {
		notFound()
	}
	
	// 檢查是否允許來賓報名
	if (!event.allowGuests) {
		return (
			<div className="max-w-lg mx-auto p-4 text-center">
				<h1 className="text-xl font-semibold text-red-600 mb-2">此活動不開放來賓報名</h1>
				<p className="text-gray-600">請聯繫活動主辦單位了解詳情</p>
			</div>
		)
	}
	
	// 根據活動類型選擇邀請卡
	let invitationCardUrl: string | null = null
	
	if (orgSettings) {
		switch (event.type) {
			case 'GENERAL':
			case 'JOINT':
			case 'CLOSED':
				invitationCardUrl = orgSettings.invitationCardGeneral || orgSettings.invitationCardUrl
				break
			case 'DINNER':
				invitationCardUrl = orgSettings.invitationCardDinner || orgSettings.invitationCardUrl
				break
			case 'SOFT':
				invitationCardUrl = orgSettings.invitationCardSoft || orgSettings.invitationCardUrl
				break
			case 'VISIT':
				invitationCardUrl = orgSettings.invitationCardVisit || orgSettings.invitationCardUrl
				break
			case 'BOD':
				invitationCardUrl = orgSettings.invitationCardBod || orgSettings.invitationCardUrl
				break
		}
	}
	
	return (
		<GuestRegisterClient 
			eventId={eventId}
			invitationCardUrl={invitationCardUrl}
		/>
	)
}