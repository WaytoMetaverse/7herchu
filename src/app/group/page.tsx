import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
// import { Role } from '@prisma/client'
import { Card, CardContent } from '@/components/ui/Card'
import { Users, DollarSign, UtensilsCrossed, Image, Monitor } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import GalleryCarousel from './GalleryCarousel'



export default async function GroupHomePage() {
	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const isAdmin = roles.includes('admin')
	const canManageFinance = isAdmin || roles.includes('finance_manager')
	const canManageMenu = isAdmin || roles.includes('menu_manager')
	const isLoggedIn = !!session?.user

	// 如果未登入，顯示圖片輪播
	if (!isLoggedIn) {
		const orgSettings = await prisma.orgSettings.findFirst()
		
		console.log('Group Page Debug:', {
			hasOrgSettings: !!orgSettings,
			mobileImagesCount: orgSettings?.mobileGalleryImages?.length || 0,
			desktopImagesCount: orgSettings?.desktopGalleryImages?.length || 0
		})
		
		return (
			<GalleryCarousel
				mobileImages={orgSettings?.mobileGalleryImages || []}
				desktopImages={orgSettings?.desktopGalleryImages || []}
			/>
		)
	}


	return (
		<div className="max-w-4xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl lg:text-3xl font-semibold tracking-tight truncate">小組管理</h1>
				{/* 保留右側區塊，未來可放操作按鈕；保持標題列高度一致 */}
				<div className="flex items-center gap-2"></div>
			</div>
			
			<div className={`grid gap-4 ${isLoggedIn ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
				{/* 成員管理卡片（所有內部成員可見，可點進去；操作權限於內頁控管） */}
				(
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center gap-3 mb-4">
								<Users className="w-6 h-6 text-blue-600" />
								<h2 className="text-lg font-semibold">成員管理</h2>
							</div>
							<div className="space-y-4">
								<p className="text-gray-600 text-sm">
									管理組織成員的基本資料、啟用狀態、權限設定，以及邀請新成員加入。
								</p>
								<Link
									href="/admin/member-list"
									className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded transition-colors"
								>
									成員管理
								</Link>
							</div>
						</CardContent>
					</Card>
				)

				{/* 財務管理卡片（所有內部成員可見，可點進去；操作權限於內頁控管） */}
				(
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center gap-3 mb-4">
								<DollarSign className="w-6 h-6 text-green-600" />
								<h2 className="text-lg font-semibold">財務管理</h2>
							</div>
							<div className="space-y-4">
								<p className="text-gray-600 text-sm">
									管理組織的收支記錄、成員繳費狀況等財務相關事務。
								</p>
								<Link
									href="/admin/finance"
									className="block w-full bg-green-600 hover:bg-green-700 text-white text-center py-2 px-4 rounded transition-colors"
								>
									財務管理
								</Link>
							</div>
						</CardContent>
					</Card>
				)

				{/* 菜單管理卡片（所有內部成員可見，可點進去；操作權限於內頁控管） */}
				(
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center gap-3 mb-4">
								<UtensilsCrossed className="w-6 h-6 text-orange-600" />
								<h2 className="text-lg font-semibold">菜單管理</h2>
							</div>
							<div className="space-y-4">
								<p className="text-gray-600 text-sm">
									設定每月活動的菜單選項，管理 A/B/C 三種餐點選擇。
								</p>
								<Link
									href="/admin/menus"
									className="block w-full bg-orange-600 hover:bg-orange-700 text-white text-center py-2 px-4 rounded transition-colors"
								>
									菜單管理
								</Link>
							</div>
						</CardContent>
					</Card>
				)

				{/* 邀請管理卡片（所有內部成員可見，可點進去；操作權限於內頁控管） */}
				(
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center gap-3 mb-4">
								<Image className="w-6 h-6 text-purple-600" />
								<h2 className="text-lg font-semibold">邀請管理</h2>
							</div>
							<div className="space-y-4">
								<p className="text-gray-600 text-sm">
									管理各活動類別發送來賓邀請訊息時使用的邀請卡片與邀請訊息。
								</p>
								<Link
									href="/admin/invitations"
									className="block w-full bg-purple-600 hover:bg-purple-700 text-white text-center py-2 px-4 rounded transition-colors"
								>
									邀請管理
								</Link>
							</div>
						</CardContent>
					</Card>
				)

				{/* 展示設定卡片（所有內部成員可見，可點進去；操作權限於內頁控管） */}
				(
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center gap-3 mb-4">
								<Monitor className="w-6 h-6 text-indigo-600" />
								<h2 className="text-lg font-semibold">展示設定</h2>
							</div>
							<div className="space-y-4">
								<p className="text-gray-600 text-sm">
									管理未登入用戶看到的小組展示圖片，分別設定手機版和電腦版。
								</p>
								<Link
									href="/admin/gallery"
									className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center py-2 px-4 rounded transition-colors"
								>
									展示設定
								</Link>
							</div>
						</CardContent>
					</Card>
				)
			</div>
		</div>
	)
}


