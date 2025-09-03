import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

export default async function InvitationsPage() {
	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const isAdmin = roles.includes('admin')
	if (!isAdmin) redirect('/hall')

	// 取得組織設定中的邀請卡和訊息
	const orgSettings = await prisma.orgSettings.findFirst()

	// 上傳邀請卡
	async function uploadInvitationCard(formData: FormData) {
		'use server'
		const file = formData.get('file') as File
		const cardType = formData.get('cardType') as string
		
		if (!file || file.size === 0 || !cardType) return

		// 檢查檔案類型
		if (!file.type.startsWith('image/')) {
			return
		}

		// 上傳檔案
		const uploadFormData = new FormData()
		uploadFormData.append('file', file)
		
		const uploadRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/upload`, {
			method: 'POST',
			body: uploadFormData
		})
		
		const uploadData = await uploadRes.json()
		if (!uploadRes.ok || !uploadData?.url) return

		// 根據卡片類型更新不同欄位
		const updateField = {
			general: 'invitationCardGeneral',
			dinner: 'invitationCardDinner',
			soft: 'invitationCardSoft',
			bod: 'invitationCardBod'
		}[cardType]
		
		if (!updateField) return

		// 更新組織設定
		await prisma.orgSettings.upsert({
			where: { id: 'singleton' },
			create: {
				id: 'singleton',
				bankInfo: '',
				[updateField]: uploadData.url
			},
			update: {
				[updateField]: uploadData.url
			}
		})

		revalidatePath('/admin/invitations')
	}

	// 刪除邀請卡
	async function deleteInvitationCard(formData: FormData) {
		'use server'
		const cardType = formData.get('cardType') as string
		if (!cardType) return

		const updateField = {
			general: 'invitationCardGeneral',
			dinner: 'invitationCardDinner',
			soft: 'invitationCardSoft',
			bod: 'invitationCardBod'
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
		const messageType = formData.get('messageType') as string
		const message = formData.get('message') as string
		
		if (!messageType) return

		const updateField = {
			general: 'invitationMessageGeneral',
			dinner: 'invitationMessageDinner',
			soft: 'invitationMessageSoft',
			bod: 'invitationMessageBod'
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
		}
	]

	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">邀請管理</h1>
				<Button as={Link} href="/group" variant="outline">返回小組管理</Button>
			</div>

			{/* 邀請卡列表 */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{cards.map((card) => (
					<div key={card.type} className="bg-white rounded-lg border overflow-hidden">
						{/* 標題區 */}
						<div className={`p-4 bg-${card.color}-50 border-b`}>
							<h3 className={`font-medium text-${card.color}-900`}>{card.title}</h3>
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
									</div>
								) : (
									<div className="text-center py-4 text-gray-400 border-2 border-dashed rounded-lg">
										<div className="mb-2">尚未上傳</div>
										<form action={uploadInvitationCard} className="space-y-3">
											<input type="hidden" name="cardType" value={card.type} />
											<input 
												type="file" 
												name="file" 
												accept="image/*" 
												required
												className="w-full text-sm px-2"
											/>
											<Button type="submit" variant="primary" size="sm">
												上傳圖片
											</Button>
										</form>
									</div>
								)}
							</div>

							{/* 邀請訊息編輯 */}
							<div className="border-t pt-4">
								<h4 className="text-sm font-medium text-gray-700 mb-2">邀請訊息</h4>
								<form action={updateInvitationMessage} className="space-y-2">
									<input type="hidden" name="messageType" value={card.type} />
									<textarea
										name="message"
										defaultValue={card.message}
										placeholder="請輸入邀請訊息"
										className="w-full p-2 border rounded-lg resize-none h-20 text-sm"
									/>
									<div className="flex gap-2">
										<Button type="submit" variant="primary" size="sm">
											儲存
										</Button>
										<Button 
											type="button" 
											variant="outline" 
											size="sm"
											onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
												const form = e.currentTarget.closest('form')
												const textarea = form?.querySelector('textarea')
												if (textarea) {
													textarea.value = card.message || '磐石砌好厝誠摯地邀請您一同來參與'
												}
											}}
										>
											取消
										</Button>
									</div>
								</form>
								<div className="mt-2 text-xs text-gray-500">
									<div>訊息會自動加上活動資訊：</div>
									<div className="font-mono mt-1 p-2 bg-gray-50 rounded">
										<div>日期 | 2025/09/04（四）</div>
										<div>時間 | 18:30</div>
										<div>地點 | 富興工廠2F</div>
										<div>報名連結: ...</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
