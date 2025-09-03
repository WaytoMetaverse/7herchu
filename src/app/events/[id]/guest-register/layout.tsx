import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

type Props = {
	params: Promise<{ id: string }>
	children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { id } = await params
	
	// 獲取活動資訊和組織設定
	const [event, orgSettings] = await Promise.all([
		prisma.event.findUnique({ where: { id } }),
		prisma.orgSettings.findFirst()
	])
	
	if (!event) {
		return {
			title: '活動報名',
			description: '活動報名頁面'
		}
	}
	
	// 根據活動類型選擇邀請卡
	let invitationCardUrl: string | null = null
	let invitationMessage = '磐石砌好厝誠摯地邀請您一同來參與'
	
	if (orgSettings) {
		switch (event.type) {
			case 'GENERAL':
			case 'JOINT':
			case 'CLOSED':
				invitationCardUrl = orgSettings.invitationCardGeneral
				invitationMessage = orgSettings.invitationMessageGeneral || invitationMessage
				break
			case 'DINNER':
				invitationCardUrl = orgSettings.invitationCardDinner
				invitationMessage = orgSettings.invitationMessageDinner || invitationMessage
				break
			case 'SOFT':
				invitationCardUrl = orgSettings.invitationCardSoft
				invitationMessage = orgSettings.invitationMessageSoft || invitationMessage
				break
			case 'BOD':
				invitationCardUrl = orgSettings.invitationCardBod
				invitationMessage = orgSettings.invitationMessageBod || invitationMessage
				break
		}
	}
	
	const eventDate = format(event.startAt, 'yyyy/MM/dd（EEEEE） HH:mm', { locale: zhTW })
	const description = `${invitationMessage}\n${eventDate}\n${event.location || ''}`
	
	return {
		title: `${event.title} - 來賓報名`,
		description: description,
		openGraph: {
			title: event.title,
			description: description,
			type: 'website',
			images: invitationCardUrl ? [
				{
					url: invitationCardUrl,
					width: 1200,
					height: 630,
					alt: event.title,
				}
			] : [],
			locale: 'zh_TW',
		},
		twitter: {
			card: 'summary_large_image',
			title: event.title,
			description: description,
			images: invitationCardUrl ? [invitationCardUrl] : [],
		},
	}
}

export default function GuestRegisterLayout({ children }: { children: React.ReactNode }) {
	return <>{children}</>
}
