import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
// import { Role } from '@prisma/client'
import { Card, CardContent } from '@/components/ui/Card'
import { Users, DollarSign, UtensilsCrossed, Image } from 'lucide-react'
import { revalidatePath } from 'next/cache'


export default async function GroupHomePage() {
	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const isAdmin = roles.includes('admin')
	const canManageFinance = isAdmin || roles.includes('finance_manager')
	const canManageMenu = isAdmin || roles.includes('menu_manager')
	const isLoggedIn = !!session?.user
	const users = await prisma.user.findMany({ 
		where: { isActive: true },
		orderBy: { createdAt: 'asc' }, 
		include: { memberProfile: true } 
	})

	return (
		<div className="max-w-4xl mx-auto p-4 space-y-6">
			<h1 className="text-2xl lg:text-3xl font-semibold">小組管理</h1>
			
			<div className={`grid gap-4 ${isLoggedIn ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
				{/* 成員名單卡片 */}
				<Card className="hover:shadow-lg transition-shadow">
					<CardContent className="p-6">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-3">
								<Users className="w-6 h-6 text-blue-600" />
								<h2 className="text-lg font-semibold">成員名單</h2>
							</div>
							{isAdmin ? <Link href="/admin/member-list" className="text-sm text-blue-600 underline">管理成員</Link> : null}
						</div>
						<div className="space-y-2 max-h-96 overflow-y-auto">
							{users.slice(0, 10).map((u) => (
								<div key={u.id}>
									{isLoggedIn ? (
										<Link href={`/profile/${u.id}`} className="block">
											<div className="border rounded p-3 text-sm hover:bg-gray-50 transition-colors cursor-pointer">
												<div className="flex items-start justify-between">
													<div className="flex-1">
														<div className="font-medium">{(u.name ?? '(未命名)')}{u.memberProfile?.occupation ? ` · ${u.memberProfile.occupation}` : ''}</div>
														<div className="text-gray-700">{u.memberProfile?.companyName ?? '-'}</div>
														<div className="text-gray-600">{u.memberProfile?.workDescription ?? '-'}</div>
													</div>
													{isAdmin && (
														<form action={async (formData: FormData) => {
															'use server'
															const userId = String(formData.get('userId') || '')
															if (!userId) return
															await prisma.$transaction([
																prisma.memberProfile.updateMany({ where: { userId }, data: { active: false } }),
																prisma.user.update({ where: { id: userId }, data: { googleId: null, passwordHash: null, roles: { set: [] } } }),
															])
															revalidatePath('/group')
														}}>
														<input type="hidden" name="userId" value={u.id} />
														<button type="submit" className="ml-2 px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors">
															刪除
														</button>
													</form>
												)}
											</div>
										</div>
									</Link>
									) : (
										<div className="border rounded p-3 text-sm bg-gray-50">
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<div className="font-medium">{(u.name ?? '(未命名)')}{u.memberProfile?.occupation ? ` · ${u.memberProfile.occupation}` : ''}</div>
													<div className="text-gray-700">{u.memberProfile?.companyName ?? '-'}</div>
													<div className="text-gray-600">{u.memberProfile?.workDescription ?? '-'}</div>
												</div>
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* 財務管理卡片 */}
				{canManageFinance && (
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
				)}

				{/* 菜單管理卡片 */}
				{canManageMenu && (
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
				)}

				{/* 邀請卡管理卡片 */}
				{isAdmin && (
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center gap-3 mb-4">
								<Image className="w-6 h-6 text-purple-600" />
								<h2 className="text-lg font-semibold">邀請卡管理</h2>
							</div>
							<div className="space-y-4">
								<p className="text-gray-600 text-sm">
									管理來賓邀請時使用的邀請卡片圖像。
								</p>
								<Link
									href="/admin/invitation-cards"
									className="block w-full bg-purple-600 hover:bg-purple-700 text-white text-center py-2 px-4 rounded transition-colors"
								>
									邀請卡管理
								</Link>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	)
}


