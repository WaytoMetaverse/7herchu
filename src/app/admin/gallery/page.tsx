import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import GalleryUpload from './GalleryUpload'

export const metadata = {
	title: '展示設定 - 磐石砌好厝',
	description: '管理小組展示圖片'
}

export default async function GalleryPage() {
	const session = await getServerSession(authOptions)
	if (!session?.user) redirect('/auth/signin')
	
	const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles) ?? []
	const isAdmin = roles.includes('admin' as Role)
	
	if (!isAdmin) {
		redirect('/group')
	}

	// 獲取組織設定
	const orgSettings = await prisma.orgSettings.findFirst()

	// 刪除圖片的 Server Action
	async function deleteImage(formData: FormData) {
		'use server'
		const imageUrl = String(formData.get('imageUrl'))
		const imageType = String(formData.get('imageType')) as 'mobile' | 'desktop'
		
		if (!imageUrl || !imageType) return

		const orgSettings = await prisma.orgSettings.findFirst()
		if (!orgSettings) return

		const currentImages = imageType === 'mobile' 
			? orgSettings.mobileGalleryImages 
			: orgSettings.desktopGalleryImages

		const updatedImages = currentImages.filter(url => url !== imageUrl)

		await prisma.orgSettings.update({
			where: { id: orgSettings.id },
			data: {
				[imageType === 'mobile' ? 'mobileGalleryImages' : 'desktopGalleryImages']: updatedImages
			}
		})

		revalidatePath('/admin/gallery')
	}


	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">展示設定</h1>
				<Button as={Link} href="/group" variant="outline">返回小組管理</Button>
			</div>

			<div className="bg-blue-50 p-4 rounded-lg">
				<h2 className="font-medium mb-2">使用說明</h2>
				<div className="text-sm text-gray-700 space-y-1">
					<p>• 未登入的來賓和講師訪問「小組」頁面時，會看到這些展示圖片</p>
					<p>• 每個版本最多 8 張圖片，支援 JPG、PNG 格式</p>
					<p>• 圖片會自動壓縮，單張限制 2MB</p>
				</div>
			</div>

			{/* 手機版圖片管理 */}
			<div className="bg-white rounded-lg border p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-medium">📱 手機版圖片</h2>
					<span className="text-sm text-gray-500">
						{orgSettings?.mobileGalleryImages?.length || 0} / 8 張
					</span>
				</div>
				
				<GalleryUpload 
					imageType="mobile"
					currentImages={orgSettings?.mobileGalleryImages || []}
					maxImages={8}
				/>

				{orgSettings?.mobileGalleryImages && orgSettings.mobileGalleryImages.length > 0 && (
					<div className="mt-6">
						<h3 className="font-medium mb-3">目前圖片</h3>
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
							{orgSettings.mobileGalleryImages.map((imageUrl, index) => (
								<div key={imageUrl} className="relative group">
									<img 
										src={imageUrl} 
										alt={`手機版圖片 ${index + 1}`}
										className="w-full aspect-[3/4] object-cover rounded-lg border"
									/>
									<form action={deleteImage} className="absolute top-2 right-2">
										<input type="hidden" name="imageUrl" value={imageUrl} />
										<input type="hidden" name="imageType" value="mobile" />
										<button
											type="submit"
											className="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
											title="刪除圖片"
										>
											×
										</button>
									</form>
									<div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
										{index + 1}
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* 電腦版圖片管理 */}
			<div className="bg-white rounded-lg border p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-medium">💻 電腦版圖片</h2>
					<span className="text-sm text-gray-500">
						{orgSettings?.desktopGalleryImages?.length || 0} / 8 張
					</span>
				</div>
				
				<GalleryUpload 
					imageType="desktop"
					currentImages={orgSettings?.desktopGalleryImages || []}
					maxImages={8}
				/>

				{orgSettings?.desktopGalleryImages && orgSettings.desktopGalleryImages.length > 0 && (
					<div className="mt-6">
						<h3 className="font-medium mb-3">目前圖片</h3>
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
							{orgSettings.desktopGalleryImages.map((imageUrl, index) => (
								<div key={imageUrl} className="relative group">
									<img 
										src={imageUrl} 
										alt={`電腦版圖片 ${index + 1}`}
										className="w-full aspect-[16/9] object-cover rounded-lg border"
									/>
									<form action={deleteImage} className="absolute top-2 right-2">
										<input type="hidden" name="imageUrl" value={imageUrl} />
										<input type="hidden" name="imageType" value="desktop" />
										<button
											type="submit"
											className="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
											title="刪除圖片"
										>
											×
										</button>
									</form>
									<div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
										{index + 1}
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
