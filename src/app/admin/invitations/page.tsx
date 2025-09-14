import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import MessageEditor from './MessageEditor'
import InvitationUpload from './InvitationUpload'

export default async function InvitationsPage() {
	const session = await getServerSession(authOptions)
	if (!session?.user) redirect('/auth/signin')
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const isAdmin = roles.includes('admin')

	// 取得組織設定中的邀請卡和訊息
	const orgSettings = await prisma.orgSettings.findFirst()


	// 刪除邀請卡
	async function deleteInvitationCard(formData: FormData) {
		'use server'
		// 僅管理者可執行
		const session = await getServerSession(authOptions)
		const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
		if (!roles.includes('admin')) return
		const cardType = formData.get('cardType') as string
		if (!cardType) return

		const updateField = {
			general: 'invitationCardGeneral',
			dinner: 'invitationCardDinner',
			soft: 'invitationCardSoft',
			bod: 'invitationCardBod',
			visit: 'invitationCardVisit'
		}[cardType]
		
		if (!updateField) return

		await prisma.orgSettings.update({
			where: { id: 'singleton' },
			data: {
				[updateField]: null
			}
		})

		revalidatePath('/admin/invitations')
	}

	// 更新邀請訊息
	async function updateInvitationMessage(formData: FormData) {
		'use server'
		// 僅管理者可執行
		const session = await getServerSession(authOptions)
		const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
		if (!roles.includes('admin')) return
		const messageType = formData.get('messageType') as string
		const message = formData.get('message') as string
		
		if (!messageType) return

		const updateField = {
			general: 'invitationMessageGeneral',
			dinner: 'invitationMessageDinner',
			soft: 'invitationMessageSoft',
			bod: 'invitationMessageBod',
			visit: 'invitationMessageVisit'
		}[messageType]
		
		if (!updateField) return

		await prisma.orgSettings.upsert({
			where: { id: 'singleton' },
			create: {
				id: 'singleton',
				bankInfo: '',
				[updateField]: message || '磐石砌好厝誠摯地邀請您一同來參與'
			},
			update: {
				[updateField]: message || '磐石砌好厝誠摯地邀請您一同來參與'
			}
		})

		revalidatePath('/admin/invitations')
	}

	const cards = [
		{
			type: 'speaker',
			title: '講師預約',
			imageUrl: orgSettings?.invitationCardSpeaker,
			message: orgSettings?.invitationMessageSpeaker || '',
			color: 'teal'
		},
		{
			type: 'general',
			title: '簡報組聚 / 聯合組聚 / 封閉會議',
			imageUrl: orgSettings?.invitationCardGeneral,
			message: orgSettings?.invitationMessageGeneral || '',
			color: 'blue'
		},
		{
			type: 'dinner',
			title: '餐敘',
			imageUrl: orgSettings?.invitationCardDinner,
			message: orgSettings?.invitationMessageDinner || '',
			color: 'green'
		},
		{
			type: 'soft',
			title: '軟性活動',
			imageUrl: orgSettings?.invitationCardSoft,
			message: orgSettings?.invitationMessageSoft || '',
			color: 'purple'
		},
		{
			type: 'bod',
			title: 'BOD',
			imageUrl: orgSettings?.invitationCardBod,
			message: orgSettings?.invitationMessageBod || '',
			color: 'orange'
		},
		{
			type: 'visit',
			title: '職業參訪',
			imageUrl: orgSettings?.invitationCardVisit,
			message: orgSettings?.invitationMessageVisit || '',
			color: 'amber'
		}
	]

	const colorStyles: Record<string, { bg: string; text: string }> = {
		teal: { bg: 'bg-teal-50', text: 'text-teal-900' },
		blue: { bg: 'bg-blue-50', text: 'text-blue-900' },
		green: { bg: 'bg-green-50', text: 'text-green-900' },
		purple: { bg: 'bg-purple-50', text: 'text-purple-900' },
		orange: { bg: 'bg-orange-50', text: 'text-orange-900' },
		amber: { bg: 'bg-amber-50', text: 'text-amber-900' },
	}

	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold truncate">邀請管理</h1>
				<Button as={Link} href="/group" variant="outline" className="whitespace-nowrap">返回小組管理</Button>
			</div>

			{/* 邀請卡列表 */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{cards.map((card) => {
					return (
						<div key={card.type} className="bg-white rounded-lg border overflow-hidden">
							{/* 標題區 */}
							<div className={["p-4", colorStyles[card.color]?.bg, "border-b"].join(" ") }>
								<h3 className={["font-medium", colorStyles[card.color]?.text].join(" ") }>{card.title}</h3>
							</div>

							{/* 內容區 */}
							<div className="p-4 space-y-4">
								{/* 邀請卡管理 */}
								<div>
									<h4 className="text-sm font-medium text-gray-700 mb-2">邀請卡</h4>
									{card.imageUrl ? (
										<div className="space-y-3">
											{/* eslint-disable-next-line @next/next/no-img-element */}
											<img 
												src={card.imageUrl} 
												alt={card.title}
												className="w-full rounded-lg border shadow-sm"
											/>
											{isAdmin ? (
												<form action={deleteInvitationCard} className="text-center">
													<input type="hidden" name="cardType" value={card.type} />
													<Button 
														type="submit" 
														variant="outline" 
														size="sm"
														className="text-red-600 hover:text-red-700"
													>
														刪除邀請卡
													</Button>
												</form>
											) : (
												<div className="h-8" />
											)}
										</div>
									) : (
										<div className="text-center py-4 text-gray-400 border-2 border-dashed rounded-lg">
											<div className="mb-2">尚未上傳</div>
											{isAdmin ? (
													<InvitationUpload 
														cardType={card.type}
													/>
												) : null}
										</div>
									)}
								</div>

								{/* 邀請訊息編輯 */}
								<div className="border-t pt-4">
									<h4 className="text-sm font-medium text-gray-700 mb-2">邀請訊息</h4>
									{isAdmin ? (
										<MessageEditor 
											messageType={card.type}
											defaultMessage={card.message}
											updateAction={updateInvitationMessage}
										/>
									) : null}
									<div className="mt-2 text-xs text-gray-500">
										<div>訊息會自動加上活動資訊：</div>
										<div className="font-mono mt-1 p-2 bg-gray-50 rounded">
											{card.type === 'speaker' ? (
												<div>
													<div>預約連結: /calendar</div>
												</div>
											) : (
												<div>
													<div>日期 | 2025/09/04（四）</div>
													<div>時間 | 18:30</div>
													<div>地點 | 富興工廠2F</div>
													<div>報名連結: ...</div>
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
					)
				})}
			</div>
		</div>
	)
}
