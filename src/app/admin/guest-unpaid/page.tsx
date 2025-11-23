import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Link from 'next/link'

export default async function GuestUnpaidPage() {
	const session = await getServerSession(authOptions)
	if (!session?.user) redirect('/auth/signin')
	
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const canManage = roles.includes('admin') || roles.includes('finance_manager')
	
	// 查詢所有活動中未繳費的來賓
	const events = await prisma.event.findMany({
		where: {
			type: { in: ['BOD', 'DINNER', 'SOFT', 'VISIT'] },
			// 只查詢有設定來賓價格的活動
			OR: [
				{ guestPriceCents: { not: null } },
				{ bodGuestPriceCents: { not: null } }
			]
		},
		include: {
			registrations: {
				where: { 
					role: 'GUEST',  // 只查詢來賓
					status: 'REGISTERED',  // 只查詢已報名狀態
					paymentStatus: 'UNPAID'  // 只查詢未繳費
				},
				orderBy: { createdAt: 'asc' }
			}
		},
		orderBy: { startAt: 'asc' }
	})

	// 活動類型標籤
	const TYPE_LABEL = {
		BOD: 'BOD',
		DINNER: '餐敘',
		SOFT: '軟性活動',
		VISIT: '職業參訪'
	}

	// 計算來賓價格
	function getGuestPrice(event: typeof events[0]): number {
		if (event.type === 'BOD') {
			return (event.bodGuestPriceCents || 0) / 100
		}
		
		if (event.type === 'DINNER' || event.type === 'SOFT' || event.type === 'VISIT') {
			return (event.guestPriceCents || 0) / 100
		}
		
		return 0
	}

	// 過濾出有未繳費來賓的活動
	const eventsWithUnpaidGuests = events.filter(event => {
		const price = getGuestPrice(event)
		return event.registrations.length > 0 && price > 0
	})

	// 分群：今日與未來 / 過去
	const now = new Date()
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const upcoming = eventsWithUnpaidGuests.filter(e => e.startAt >= todayStart)
	const past = eventsWithUnpaidGuests.filter(e => e.startAt < todayStart)
	const pastDesc = [...past].sort((a, b) => b.startAt.getTime() - a.startAt.getTime())

	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold truncate">來賓未繳費管理</h1>
				<Button as={Link} href="/admin/finance" variant="outline" size="sm" className="whitespace-nowrap">
					返回財務管理
				</Button>
			</div>

			{/* 提示訊息 */}
			{!canManage && (
				<div className="bg-blue-50 p-4 rounded-lg text-sm">
					<p className="text-blue-800">您可以查看來賓未繳費狀態，但無法進行繳費操作。如需協助，請聯繫財務管理員。</p>
				</div>
			)}

			{(upcoming.length + pastDesc.length) === 0 ? (
				<div className="text-center py-12 text-gray-500">
					<p>目前沒有未繳費的來賓</p>
				</div>
			) : (
				<div className="space-y-8">
					{/* 即將與今日 */}
					{upcoming.length > 0 && upcoming.map(event => {
						const guestPrice = getGuestPrice(event)
						return (
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
											<div className="text-sm text-gray-600">未繳費來賓數</div>
											<div className="text-2xl font-bold text-red-600">
												{event.registrations.length}
											</div>
										</div>
									</div>

									{event.registrations.length > 0 ? (
										<div>
											<h3 className="font-medium mb-3">未繳費來賓名單</h3>
											<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
												{event.registrations.map(reg => (
													<div key={reg.id} className="bg-gray-50 p-3 rounded-lg">
														<div className="flex items-center justify-between">
															<div>
																<div className="font-medium">{reg.name || '-'}</div>
																<div className="text-sm text-gray-600">
																	來賓
																</div>
															</div>
															<div className="text-right">
																<div className="font-medium text-red-600">
																	${guestPrice}
																</div>
																{canManage && (
																	<Button 
																		as={Link} 
																		href={`/admin/checkin/${event.id}`}
																		size="sm"
																		variant="outline"
																		className="text-xs mt-1"
																	>
																		前往繳費
																	</Button>
																)}
															</div>
														</div>
													</div>
												))}
											</div>
										</div>
									) : (
										<div className="text-center py-4 text-gray-500">
											<p>此活動無未繳費來賓</p>
										</div>
									)}
								</CardContent>
							</Card>
						)
					})}

					{/* 過去的活動 */}
					{pastDesc.length > 0 && (
						<div className="space-y-6">
							<h2 className="text-lg font-semibold text-gray-800">過去的活動(新到舊)</h2>
							{pastDesc.map(event => {
								const guestPrice = getGuestPrice(event)
								return (
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
													<div className="text-sm text-gray-600">未繳費來賓數</div>
													<div className="text-2xl font-bold text-red-600">
														{event.registrations.length}
													</div>
												</div>
											</div>

											{event.registrations.length > 0 ? (
												<div>
													<h3 className="font-medium mb-3">未繳費來賓名單</h3>
													<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
														{event.registrations.map(reg => (
															<div key={reg.id} className="bg-gray-50 p-3 rounded-lg">
																<div className="flex items-center justify-between">
																	<div>
																		<div className="font-medium">{reg.name || '-'}</div>
																		<div className="text-sm text-gray-600">
																			來賓
																		</div>
																	</div>
																	<div className="text-right">
																		<div className="font-medium text-red-600">
																			${guestPrice}
																		</div>
																		{canManage && (
																			<Button 
																				as={Link} 
																				href={`/admin/checkin/${event.id}`}
																				size="sm"
																				variant="outline"
																				className="text-xs mt-1"
																			>
																				前往繳費
																			</Button>
																		)}
																	</div>
																</div>
															</div>
														))}
													</div>
												</div>
											) : (
												<div className="text-center py-4 text-gray-500">
													<p>此活動無未繳費來賓</p>
												</div>
											)}
										</CardContent>
									</Card>
								)
							})}
						</div>
					)}
				</div>
			)}
		</div>
	)
}

