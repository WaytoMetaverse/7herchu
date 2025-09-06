import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { getDisplayName } from '@/lib/displayName'

export default async function ActivityUnpaidPage() {
	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const canManage = roles.includes('admin') || roles.includes('finance_manager')
	
	if (!canManage) {
		redirect('/admin/finance')
	}

	// 查詢 BOD/餐敘/軟性活動
	const events = await prisma.event.findMany({
		where: {
			type: { in: ['BOD', 'DINNER', 'SOFT'] },
			// 只查詢有設定價格的活動
			OR: [
				{ defaultPriceCents: { not: null } },
				{ guestPriceCents: { not: null } },
				{ bodMemberPriceCents: { not: null } },
				{ bodGuestPriceCents: { not: null } }
			]
		},
		include: {
			registrations: {
				where: { 
					status: 'REGISTERED',  // 只查詢已報名狀態
					paymentStatus: 'UNPAID'  // 只查詢未繳費
				},
				include: { 
					user: { select: { name: true, nickname: true } } 
				},
				orderBy: { createdAt: 'asc' }
			}
		},
		orderBy: { startAt: 'desc' }
	})

	// 活動類型標籤
	const TYPE_LABEL = {
		BOD: 'BOD',
		DINNER: '餐敘',
		SOFT: '軟性活動'
	}

	// 計算活動價格
	function getEventPrice(event: typeof events[0], isLoggedIn: boolean): number {
		if (event.type === 'BOD') {
			return isLoggedIn ? 
				(event.bodMemberPriceCents || 0) / 100 : 
				(event.bodGuestPriceCents || 0) / 100
		}
		
		if (event.type === 'DINNER' || event.type === 'SOFT') {
			return isLoggedIn ? 
				(event.defaultPriceCents || 0) / 100 : 
				(event.guestPriceCents || 0) / 100
		}
		
		return 0
	}

	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">活動未繳費管理</h1>
				<Button as={Link} href="/admin/finance" variant="outline" size="sm">
					返回財務管理
				</Button>
			</div>

			{events.length === 0 ? (
				<div className="text-center py-12 text-gray-500">
					<p>目前沒有需要繳費的活動</p>
				</div>
			) : (
				<div className="space-y-6">
					{events.map(event => (
						<Card key={event.id}>
							<CardContent className="p-6">
								<div className="flex items-center justify-between mb-4">
									<div>
										<h2 className="text-lg font-semibold">{event.title}</h2>
										<div className="text-sm text-gray-600 space-y-1">
											<div>{TYPE_LABEL[event.type as keyof typeof TYPE_LABEL]}</div>
											<div>{format(event.startAt, 'yyyy/MM/dd（EEEEE） HH:mm', { locale: zhTW })}</div>
											<div>{event.location}</div>
										</div>
									</div>
									<div className="text-right">
										<div className="text-sm text-gray-600">未繳費人數</div>
										<div className="text-2xl font-bold text-red-600">
											{event.registrations.filter(reg => {
												const isLoggedIn = !!reg.userId
												const price = getEventPrice(event, isLoggedIn)
												return price > 0
											}).length}
										</div>
									</div>
								</div>

								{(() => {
									const unpaidWithPrice = event.registrations.filter(reg => {
										const isLoggedIn = !!reg.userId
										const price = getEventPrice(event, isLoggedIn)
										return price > 0  // 只顯示價格大於0的項目
									})
									
									return unpaidWithPrice.length > 0 ? (
										<div>
											<h3 className="font-medium mb-3">未繳費名單</h3>
											<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
												{unpaidWithPrice.map(reg => {
													const isLoggedIn = !!reg.userId
													const price = getEventPrice(event, isLoggedIn)
													const displayName = isLoggedIn ? 
														getDisplayName(reg.user) || reg.name || '-' : 
														reg.name || '-'
													
													return (
														<div key={reg.id} className="bg-gray-50 p-3 rounded-lg">
															<div className="flex items-center justify-between">
																<div>
																	<div className="font-medium">{displayName}</div>
																	<div className="text-sm text-gray-600">
																		{isLoggedIn ? '成員' : '來賓'}
																	</div>
																</div>
																<div className="text-right">
																	<div className="font-medium text-red-600">
																		${price}
																	</div>
																	<Button 
																		as={Link} 
																		href={`/admin/checkin/${event.id}`}
																		size="sm"
																		variant="outline"
																		className="text-xs mt-1"
																	>
																		前往繳費
																	</Button>
																</div>
															</div>
														</div>
													)
												})}
											</div>
										</div>
									) : (
										<div className="text-center py-4 text-gray-500">
											<p>此活動無需繳費人員</p>
										</div>
									)
								})()}
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	)
}
