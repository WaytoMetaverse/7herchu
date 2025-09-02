import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export default async function EventInvitePage({ params }: { params: Promise<{ id: string }> }) {
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
			case 'BOD':
				invitationCardUrl = orgSettings.invitationCardBod
				break
		}
	}

	// 生成邀請訊息和連結
	const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/events/${eventId}/guest-register`
	const eventDate = format(event.startAt, 'yyyy/MM/dd（EEEEE） HH:mm', { locale: zhTW })
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

			{/* 邀請訊息 */}
			<div className="bg-white rounded-lg border p-4">
				<h2 className="font-medium mb-3">邀請訊息</h2>
				<div className="bg-gray-50 p-3 rounded text-sm font-mono whitespace-pre-line border">
					{inviteMessage}
				</div>
				<div className="mt-3 flex gap-2">
					<Button 
						onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
							navigator.clipboard.writeText(inviteMessage)
							const btn = e.target as HTMLButtonElement
							if (btn) {
								const original = btn.textContent
								btn.textContent = '已複製！'
								setTimeout(() => { btn.textContent = original }, 2000)
							}
						}}
						variant="secondary" 
						size="sm"
					>
						複製訊息
					</Button>
					<Button 
						onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
							navigator.clipboard.writeText(inviteUrl)
							const btn = e.target as HTMLButtonElement
							if (btn) {
								const original = btn.textContent
								btn.textContent = '已複製！'
								setTimeout(() => { btn.textContent = original }, 2000)
							}
						}}
						variant="outline" 
						size="sm"
					>
						複製連結
					</Button>
				</div>
			</div>

			{/* 分享按鈕 */}
			<div className="bg-white rounded-lg border p-4">
				<h2 className="font-medium mb-3">分享到</h2>
				<div className="grid grid-cols-2 gap-3">
					<Button 
						onClick={() => {
							if (navigator.share) {
								navigator.share({
									title: event.title,
									text: inviteMessage,
									url: inviteUrl
								}).catch(() => {
									// 如果分享失敗，回退到複製
									navigator.clipboard.writeText(inviteMessage)
								})
							} else {
								// 不支援 Web Share API，開啟 Line 分享
								const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(inviteMessage)}`
								window.open(lineUrl, '_blank')
							}
						}}
						variant="primary" 
						className="bg-green-500 hover:bg-green-600"
					>
						Line 分享
					</Button>
					<Button 
						onClick={() => {
							const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}&quote=${encodeURIComponent(inviteMessage)}`
							window.open(fbUrl, '_blank')
						}}
						variant="primary"
						className="bg-blue-600 hover:bg-blue-700"
					>
						Facebook
					</Button>
				</div>
				
				{/* iOS/Android 原生分享 */}
				<div className="mt-3">
					<Button 
						onClick={() => {
							if (navigator.share) {
								navigator.share({
									title: event.title,
									text: inviteMessage,
									url: inviteUrl
								})
							} else {
								// 回退到複製訊息
								navigator.clipboard.writeText(`${inviteMessage}`)
								alert('訊息已複製到剪貼簿，請手動分享到您想要的平台')
							}
						}}
						variant="outline"
						className="w-full"
					>
						📱 更多分享選項
					</Button>
				</div>
			</div>

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
