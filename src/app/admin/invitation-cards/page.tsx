import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

export default async function InvitationCardsPage() {
	const session = await getServerSession(authOptions)
	if (!session?.user) redirect('/auth/signin')
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const isAdmin = roles.includes('admin')

	// 取得組織設定中的邀請卡
	const orgSettings = await prisma.orgSettings.findFirst()

	// 上傳邀請卡
	async function uploadInvitationCard(formData: FormData) {
		'use server'
		const session = await getServerSession(authOptions)
		const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
		if (!roles.includes('admin')) return
		const file = formData.get('file') as File
		const cardType = formData.get('cardType') as string
		
		if (!file || file.size === 0 || !cardType) return

		// 檢查檔案類型
		if (!file.type.startsWith('image/')) {
			return // 應該要有錯誤處理，這裡簡化
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
			bod: 'invitationCardBod',
			visit: 'invitationCardVisit'
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

		revalidatePath('/admin/invitation-cards')
	}

	// 刪除邀請卡
	async function deleteInvitationCard(formData: FormData) {
		'use server'
		const session = await getServerSession(authOptions)
		const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
		if (!roles.includes('admin')) return
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

		revalidatePath('/admin/invitation-cards')
	}

	const cards = [
		{
			type: 'general',
			title: '簡報組聚 / 聯合組聚 / 封閉會議',
			description: '用於簡報組聚、聯合組聚、封閉會議的邀請',
			imageUrl: orgSettings?.invitationCardGeneral,
			color: 'blue'
		},
		{
			type: 'dinner',
			title: '餐敘',
			description: '用於餐敘活動的邀請',
			imageUrl: orgSettings?.invitationCardDinner,
			color: 'green'
		},
		{
			type: 'soft',
			title: '軟性活動',
			description: '用於軟性活動的邀請',
			imageUrl: orgSettings?.invitationCardSoft,
			color: 'purple'
		},
		{
			type: 'bod',
			title: 'BOD',
			description: '用於 BOD 活動的邀請',
			imageUrl: orgSettings?.invitationCardBod,
			color: 'orange'
		},
		{
			type: 'visit',
			title: '職業參訪',
			description: '用於職業參訪活動的邀請',
			imageUrl: orgSettings?.invitationCardVisit,
			color: 'amber'
		}
	]

	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">邀請卡管理</h1>
				<Button as={Link} href="/group" variant="outline">返回小組管理</Button>
			</div>

			{/* 邀請卡列表 */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{cards.map((card) => (
					<div key={card.type} className="bg-white rounded-lg border overflow-hidden">
						{/* 標題區 */}
						<div className={`p-4 bg-${card.color}-50 border-b`}>
							<h3 className={`font-medium text-${card.color}-900`}>{card.title}</h3>
							<p className={`text-sm text-${card.color}-700 mt-1`}>{card.description}</p>
						</div>

						{/* 圖片區 */}
						<div className="p-4">
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
									) : null}
								</div>
							) : (
								<div className="text-center py-8 text-gray-400">
									<div className="mb-2">尚未上傳</div>
									{isAdmin ? (
										<form action={uploadInvitationCard} className="space-y-3">
											<input type="hidden" name="cardType" value={card.type} />
											<input 
												type="file" 
												name="file" 
												accept="image/*" 
												required
												className="w-full text-sm"
											/>
											<Button type="submit" variant="primary" size="sm">
												上傳圖片
											</Button>
										</form>
									) : null}
								</div>
							)}
						</div>
					</div>
				))}
			</div>

			{/* 使用說明 */}
			<div className="bg-blue-50 rounded-lg p-4">
				<h3 className="font-medium text-blue-900 mb-2">使用說明</h3>
				<div className="text-sm text-blue-800 space-y-1">
					<div>• 不同類型的活動可以使用不同的邀請卡</div>
					<div>• 系統會根據活動類型自動選擇對應的邀請卡</div>
					<div>• 邀請卡會在「來賓邀請」分享時顯示</div>
					<div>• 圖片會在 Line、Facebook 等平台的分享預覽中顯示</div>
				</div>
			</div>
		</div>
	)
}