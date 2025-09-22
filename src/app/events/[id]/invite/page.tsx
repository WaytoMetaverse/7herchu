import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import InviteClient from './InviteClient'
import { unstable_noStore as noStore } from 'next/cache'

export default async function EventInvitePage({ params }: { params: Promise<{ id: string }> }) {
	// 禁用快取，確保邀請卡更新能即時反映
	noStore()
	
	const { id: eventId } = await params
	const session = await getServerSession(authOptions)
	if (!session?.user?.email) redirect('/auth/signin')

	const event = await prisma.event.findUnique({ where: { id: eventId } })
	if (!event) notFound()

	// 取得邀請卡
	const orgSettings = await prisma.orgSettings.findFirst()
	
	// 根據活動類型選擇對應的邀請卡
	let invitationCardUrl: string | null = null
	if (orgSettings) {
		switch (event.type) {
			case 'GENERAL':
			case 'JOINT':
			case 'CLOSED':
				invitationCardUrl = orgSettings.invitationCardGeneral
				break
			case 'DINNER':
				invitationCardUrl = orgSettings.invitationCardDinner
				break
			case 'SOFT':
				invitationCardUrl = orgSettings.invitationCardSoft
				break
			case 'VISIT':
				invitationCardUrl = orgSettings.invitationCardVisit
				break
			case 'BOD':
				invitationCardUrl = orgSettings.invitationCardBod
				break
		}
	}

	// 生成邀請訊息和連結
	const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/events/${eventId}/guest-register`
	const eventDate = format(new Date(event.startAt), 'yyyy/MM/dd（EEEEE） HH:mm', { locale: zhTW })
	const inviteMessage = `🎉 邀請您參加活動

📅 ${event.title}
🗓️ ${eventDate}
📍 ${event.location || '地點詳見活動資訊'}

點擊連結立即報名：
${inviteUrl}

期待您的參與！`

	return (
		<div className="max-w-lg mx-auto p-4 space-y-6">
			<div className="text-center space-y-2">
				<h1 className="text-2xl font-semibold">來賓邀請</h1>
				<div className="text-gray-600">
					<div className="font-medium">{event.title}</div>
					<div className="text-sm">{eventDate}</div>
					<div className="text-sm">{event.location}</div>
				</div>
			</div>

			{/* 邀請卡預覽 */}
			{invitationCardUrl && (
				<div className="bg-white rounded-lg border p-4">
					<h2 className="font-medium mb-3">邀請卡片</h2>
					<div className="max-w-xs mx-auto">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img 
							src={invitationCardUrl} 
							alt="邀請卡" 
							className="w-full rounded-lg border shadow-sm"
						/>
					</div>
				</div>
			)}

			<InviteClient 
				inviteMessage={inviteMessage}
				inviteUrl={inviteUrl}
				eventTitle={event.title}
			/>

			<div className="text-center">
				<Button as={Link} href={`/hall/${eventId}`} variant="ghost">
					返回活動
				</Button>
			</div>

			<div className="text-xs text-gray-500 text-center space-y-1">
				<div>來賓點擊連結後可直接報名參加活動</div>
				<div>報名資料將自動記錄在活動管理系統中</div>
			</div>
		</div>
	)
}
