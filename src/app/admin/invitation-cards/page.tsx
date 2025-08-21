import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

export default async function InvitationCardsPage() {
	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const isAdmin = roles.includes('admin')
	if (!isAdmin) redirect('/hall')

	// 取得組織設定中的邀請卡
	const orgSettings = await prisma.orgSettings.findFirst()

	// 上傳邀請卡
	async function uploadInvitationCard(formData: FormData) {
		'use server'
		const file = formData.get('invitationCard') as File
		if (!file || file.size === 0) return

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

		// 更新組織設定
		await prisma.orgSettings.upsert({
			where: { id: 'singleton' },
			create: {
				id: 'singleton',
				bankInfo: '',
				invitationCardUrl: uploadData.url
			},
			update: {
				invitationCardUrl: uploadData.url
			}
		})

		revalidatePath('/admin/invitation-cards')
	}

	return (
		<div className="max-w-4xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">邀請卡管理</h1>
				<Button as={Link} href="/group" variant="outline">返回小組管理</Button>
			</div>

			{/* 當前邀請卡 */}
			<div className="bg-white rounded-lg border p-6">
				<h2 className="font-medium mb-4">目前邀請卡</h2>
				{orgSettings?.invitationCardUrl ? (
					<div className="space-y-4">
						<div className="max-w-md mx-auto">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img 
								src={orgSettings.invitationCardUrl} 
								alt="邀請卡" 
								className="w-full rounded-lg border shadow-sm"
							/>
						</div>
						<div className="text-sm text-gray-600 text-center">
							此圖片將用於來賓邀請分享
						</div>
					</div>
				) : (
					<div className="text-center py-12 text-gray-500">
						<div className="mb-4">尚未上傳邀請卡</div>
						<div className="text-sm">請上傳一張圖片作為來賓邀請時使用的邀請卡</div>
					</div>
				)}
			</div>

			{/* 上傳新邀請卡 */}
			<div className="bg-white rounded-lg border p-6">
				<h2 className="font-medium mb-4">上傳邀請卡</h2>
				<form action={uploadInvitationCard} className="space-y-4">
					<div>
						<label className="block mb-2">選擇圖片檔案</label>
						<input 
							type="file" 
							name="invitationCard" 
							accept="image/*" 
							required
							className="w-full"
						/>
						<div className="text-sm text-gray-500 mt-1">
							支援 JPG、PNG、GIF 等圖片格式，建議尺寸適合手機分享
						</div>
					</div>
					<Button type="submit" variant="primary">上傳邀請卡</Button>
				</form>
			</div>

			{/* 使用說明 */}
			<div className="bg-blue-50 rounded-lg p-4">
				<h3 className="font-medium text-blue-900 mb-2">使用說明</h3>
				<div className="text-sm text-blue-800 space-y-1">
					<div>• 邀請卡會在成員分享活動給來賓時一起顯示</div>
					<div>• 建議上傳包含組織 Logo 和活動資訊的圖片</div>
					<div>• 圖片會在 Line、Facebook 等平台的分享預覽中顯示</div>
					<div>• 上傳新圖片會覆蓋舊的邀請卡</div>
				</div>
			</div>
		</div>
	)
}
