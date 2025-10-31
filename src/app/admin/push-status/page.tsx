import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { Bell, BellOff } from 'lucide-react'

export default async function PushStatusPage() {
	const session = await getServerSession(authOptions)
	if (!session?.user) redirect('/auth/signin')
	
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const isAdmin = roles.includes('admin')

	if (!isAdmin) {
		redirect('/auth/signin')
	}

	// 取得所有活躍成員及其推播通知狀態
	const members = await prisma.user.findMany({
		where: {
			isActive: true
		},
		include: {
			memberProfile: true,
			pushSubscriptions: {
				where: {
					isEnabled: true
				},
				select: {
					id: true,
					isEnabled: true,
					notifyOnRegistration: true,
					notifyEventReminder: true,
					notifyNoResponse: true,
					notifyAnnouncement: true,
					createdAt: true
				},
				orderBy: { createdAt: 'desc' },
				take: 1 // 只取最新的訂閱
			}
		},
		orderBy: { name: 'asc' }
	})

	// 計算統計
	const totalMembers = members.length
	const withNotification = members.filter(m => m.pushSubscriptions.length > 0).length
	const withoutNotification = totalMembers - withNotification

	// 顯示名稱輔助函數
	const getDisplayName = (member: { nickname?: string | null; name?: string | null }) => {
		if (member.nickname) return member.nickname
		const name = member.name || ''
		return name.length >= 2 ? name.slice(-2) : name
	}

	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">推播通知狀態</h1>
				<Button as={Link} href="/group" variant="outline">
					返回小組管理
				</Button>
			</div>

			{/* 統計資訊 */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-white border rounded-lg p-4">
					<div className="text-sm text-gray-600 mb-1">總成員數</div>
					<div className="text-2xl font-semibold">{totalMembers}</div>
				</div>
				<div className="bg-green-50 border border-green-200 rounded-lg p-4">
					<div className="text-sm text-green-700 mb-1 flex items-center gap-2">
						<Bell className="w-4 h-4" />
						已開啟通知
					</div>
					<div className="text-2xl font-semibold text-green-800">{withNotification}</div>
				</div>
				<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
					<div className="text-sm text-gray-700 mb-1 flex items-center gap-2">
						<BellOff className="w-4 h-4" />
						未開啟通知
					</div>
					<div className="text-2xl font-semibold text-gray-800">{withoutNotification}</div>
				</div>
			</div>

			{/* 成員列表 */}
			<div className="bg-white rounded-lg border overflow-hidden">
				<div className="p-4 border-b bg-gray-50">
					<h2 className="text-lg font-medium">成員通知狀態列表</h2>
				</div>
				<div className="divide-y">
					{members.length === 0 ? (
						<div className="p-8 text-center text-gray-500">
							沒有成員資料
						</div>
					) : (
						members.map((member) => {
							const subscription = member.pushSubscriptions[0]
							const hasNotification = !!subscription

							return (
								<div key={member.id} className="p-4 hover:bg-gray-50 transition-colors">
									<div className="flex items-center justify-between">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-3">
												<div>
													<h3 className="font-medium text-gray-900">
														{getDisplayName(member)} {member.name && member.nickname && `(${member.name})`}
													</h3>
													<div className="text-sm text-gray-500 mt-0.5">
														{member.email}
													</div>
												</div>
												<div className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
													hasNotification 
														? 'bg-green-100 text-green-700' 
														: 'bg-gray-100 text-gray-600'
												}`}>
													{hasNotification ? (
														<>
															<Bell className="w-4 h-4" />
															<span>已開啟</span>
														</>
													) : (
														<>
															<BellOff className="w-4 h-4" />
															<span>未開啟</span>
														</>
													)}
												</div>
											</div>

											{/* 通知偏好詳情 */}
											{hasNotification && subscription && (
												<div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-4 gap-2">
													<div className="flex items-center gap-2">
														<div className={`w-2 h-2 rounded-full ${
															subscription.notifyOnRegistration ? 'bg-green-500' : 'bg-gray-300'
														}`} />
														<span className="text-xs text-gray-600">組聚有人報名</span>
													</div>
													<div className="flex items-center gap-2">
														<div className={`w-2 h-2 rounded-full ${
															subscription.notifyEventReminder ? 'bg-green-500' : 'bg-gray-300'
														}`} />
														<span className="text-xs text-gray-600">已報活動提醒</span>
													</div>
													<div className="flex items-center gap-2">
														<div className={`w-2 h-2 rounded-full ${
															subscription.notifyNoResponse ? 'bg-green-500' : 'bg-gray-300'
														}`} />
														<span className="text-xs text-gray-600">未報組聚提醒</span>
													</div>
													<div className="flex items-center gap-2">
														<div className={`w-2 h-2 rounded-full ${
															subscription.notifyAnnouncement ? 'bg-green-500' : 'bg-gray-300'
														}`} />
														<span className="text-xs text-gray-600">公告推播</span>
													</div>
												</div>
											)}
										</div>
									</div>
								</div>
							)
						})
					)}
				</div>
			</div>
		</div>
	)
}
