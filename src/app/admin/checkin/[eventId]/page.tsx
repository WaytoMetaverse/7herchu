import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { EventType } from '@prisma/client'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export default async function CheckinManagePage({ params }: { params: Promise<{ eventId: string }> }) {
	const { eventId } = await params
	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	// 所有人都可以進入簽到管理查看
	// 但操作權限在頁面內控制
	const canCheckin = roles.includes('admin') || roles.includes('event_manager') || roles.includes('checkin_manager') || roles.includes('finance_manager')
	const canPayment = roles.includes('admin') || roles.includes('event_manager') || roles.includes('finance_manager')

	const event = await prisma.event.findUnique({ where: { id: eventId } })
	if (!event) notFound()

	// 獲取當月月份
	const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

	const [registrations, speakers] = await Promise.all([
		prisma.registration.findMany({
			where: { eventId, status: 'REGISTERED' },  // 只查詢已報名狀態
			include: { 
				user: { 
					select: { 
						name: true, 
						nickname: true,
						memberProfile: true,
						monthlyPayments: {
							where: { month: currentMonth },
							select: { isPaid: true }
						}
					} 
				} 
			},
			orderBy: [{ role: 'asc' }, { createdAt: 'asc' }]
		}),
		prisma.speakerBooking.findMany({
			where: { eventId },
			orderBy: { createdAt: 'asc' }
		})
	])

	// 計算活動價格
	function getPrice(registration: typeof registrations[0]): number {
		const eventType = event?.type as EventType
		if (!event) return 0

		// 固定價格活動（簡報組聚/封閉組聚/聯合組聚）
		if (['GENERAL', 'JOINT', 'CLOSED'].includes(eventType)) {
			if (registration.userId) {
				// 登入用戶：單次成員 180，講師 250
				return registration.role === 'SPEAKER' ? 250 : 180
			} else {
				return 250 // 來賓價格
			}
		}

		// 變動價格活動（BOD/餐敘/軟性活動）
		if (eventType === 'BOD') {
			return registration.userId ? (event.bodMemberPriceCents || 0) / 100 : (event.bodGuestPriceCents || 0) / 100
		}

		if (['DINNER', 'SOFT'].includes(eventType)) {
			return registration.userId ? (event.defaultPriceCents || 0) / 100 : (event.guestPriceCents || 0) / 100
		}

		return 0
	}

	// 判斷繳費狀態和顯示邏輯
	function getPaymentStatus(registration: typeof registrations[0]) {
		const eventType = event?.type as EventType
		const isFixedMember = registration.user?.memberProfile?.memberType === 'FIXED'
		const monthlyPayment = registration.user?.monthlyPayments?.[0]
		const isMonthlyPaid = monthlyPayment?.isPaid || false

		// 固定價格活動（簡報組聚/封閉組聚/聯合組聚）
		if (['GENERAL', 'JOINT', 'CLOSED'].includes(eventType)) {
			if (registration.userId && isFixedMember) {
				// 固定成員
				if (isMonthlyPaid) {
					return { status: 'monthly_paid', text: '月費已繳', clickable: false }
				} else {
					return { status: 'monthly_unpaid', text: '月費未繳', clickable: false }
				}
			} else {
				// 單次成員、來賓、講師
				return { 
					status: registration.paymentStatus === 'PAID' ? 'paid' : 'unpaid', 
					text: registration.paymentStatus === 'PAID' ? '已繳費' : '未繳費', 
					clickable: true 
				}
			}
		}

		// 變動價格活動（BOD/餐敘/軟性活動）
		return { 
			status: registration.paymentStatus === 'PAID' ? 'paid' : 'unpaid', 
			text: registration.paymentStatus === 'PAID' ? '已繳費' : '未繳費', 
			clickable: true 
		}
	}

	// 簽到
	async function checkIn(formData: FormData) {
		'use server'
		const registrationId = String(formData.get('registrationId'))
		if (!registrationId) return

		await prisma.registration.update({
			where: { id: registrationId },
			data: { checkedInAt: new Date() }
		})
		revalidatePath(`/admin/checkin/${eventId}`)
	}

	// 標記繳費
	async function markPaid(formData: FormData) {
		'use server'
		const registrationId = String(formData.get('registrationId'))
		if (!registrationId) return
		
		// 在 server action 中重新獲取當月月份
		const currentMonth = new Date().toISOString().slice(0, 7)

		const registration = await prisma.registration.findUnique({
			where: { id: registrationId },
			include: { 
				user: { 
					include: { 
						memberProfile: true,
						monthlyPayments: {
							where: { month: currentMonth },
							select: { isPaid: true }
						}
					} 
				},
				event: true  // 包含 event 資料
			}
		})
		if (!registration) return

		// 防重複繳費：如果已經繳費，直接返回
		if (registration.paymentStatus === 'PAID') {
			return
		}

		// 在 server action 中重新計算價格
		const eventType = registration.event?.type as EventType
		let price = 0
		
		// 固定價格活動（簡報組聚/封閉組聚/聯合組聚）
		if (['GENERAL', 'JOINT', 'CLOSED'].includes(eventType)) {
			if (registration.userId) {
				// 登入用戶：單次成員 180，講師 250
				price = registration.role === 'SPEAKER' ? 250 : 180
			} else {
				price = 250 // 來賓價格
			}
		}
		// 變動價格活動（BOD/餐敘/軟性活動）
		else if (eventType === 'BOD') {
			price = registration.userId ? (registration.event.bodMemberPriceCents || 0) / 100 : (registration.event.bodGuestPriceCents || 0) / 100
		}
		else if (['DINNER', 'SOFT'].includes(eventType)) {
			price = registration.userId ? (registration.event.defaultPriceCents || 0) / 100 : (registration.event.guestPriceCents || 0) / 100
		}

		// 更新繳費狀態
		await prisma.registration.update({
			where: { id: registrationId },
			data: { paymentStatus: 'PAID' }
		})

		// 確保財務分類存在
		const categoryName = registration.role === 'MEMBER' ? '組聚收入' : '來賓收入'
		let category = await prisma.financeCategory.findFirst({ where: { name: categoryName } })
		if (!category) {
			category = await prisma.financeCategory.create({
				data: { name: categoryName, type: 'INCOME', system: true }
			})
		}

		// 新增財務交易記錄
		const eventDate = registration.event?.startAt ? 
			new Date(registration.event.startAt).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }).replace('/', '/') : 
			''
		await prisma.financeTransaction.create({
			data: {
				date: new Date(),
				type: 'INCOME',
				amountCents: price * 100,
				counterparty: registration.user?.name || registration.name || '未命名',
				note: `${eventDate}${registration.event?.title || '活動'} - ${registration.role === 'MEMBER' ? '成員' : '來賓'}繳費`,
				categoryId: category.id,
				eventId: eventId
			}
		})

		revalidatePath(`/admin/checkin/${eventId}`)
	}

	// 取消繳費
	async function markUnpaid(formData: FormData) {
		'use server'
		const registrationId = String(formData.get('registrationId'))
		if (!registrationId) return
		
		// 在 server action 中重新獲取當月月份
		const currentMonth = new Date().toISOString().slice(0, 7)

		const registration = await prisma.registration.findUnique({
			where: { id: registrationId },
			include: { 
				user: { 
					include: { 
						memberProfile: true,
						monthlyPayments: {
							where: { month: currentMonth },
							select: { isPaid: true }
						}
					} 
				},
				event: true  // 包含 event 資料
			}
		})
		if (!registration) return

		// 更新繳費狀態
		await prisma.registration.update({
			where: { id: registrationId },
			data: { paymentStatus: 'UNPAID' }
		})

		// 刪除對應的財務記錄
		const eventDate = registration.event?.startAt ? 
			new Date(registration.event.startAt).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }).replace('/', '/') : 
			''
		await prisma.financeTransaction.deleteMany({
			where: {
				eventId: eventId,
				counterparty: registration.user?.name || registration.name || '未命名',
				note: { contains: `${eventDate}${registration.event?.title || '活動'} - ${registration.role === 'MEMBER' ? '成員' : '來賓'}繳費` }
			}
		})

		revalidatePath(`/admin/checkin/${eventId}`)
	}

	// 講師繳費
	async function markSpeakerPaid(formData: FormData) {
		'use server'
		const speakerId = String(formData.get('speakerId'))
		if (!speakerId) return

		const speaker = await prisma.speakerBooking.findUnique({
			where: { id: speakerId },
			include: { event: true }  // 包含 event 資料
		})
		if (!speaker) return

		// 防重複繳費：如果已經繳費，直接返回
		if (speaker.paymentStatus === 'PAID') {
			return
		}

		// 計算講師價格
		const eventType = speaker.event?.type as EventType
		let price = 0
		if (['GENERAL', 'JOINT', 'CLOSED'].includes(eventType)) {
			price = 250 // 講師固定價格
		} else if (eventType === 'BOD') {
			price = (speaker.event?.bodMemberPriceCents || 0) / 100
		} else if (['DINNER', 'SOFT'].includes(eventType)) {
			price = (speaker.event?.defaultPriceCents || 0) / 100
		}

		// 更新繳費狀態
		await prisma.speakerBooking.update({
			where: { id: speakerId },
			data: { paymentStatus: 'PAID' }
		})

		// 確保財務分類存在
		let category = await prisma.financeCategory.findFirst({ where: { name: '來賓收入' } })
		if (!category) {
			category = await prisma.financeCategory.create({
				data: { name: '來賓收入', type: 'INCOME', system: true }
			})
		}

		// 新增財務交易記錄
		const eventDate = speaker.event?.startAt ? 
			new Date(speaker.event.startAt).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }).replace('/', '/') : 
			''
		await prisma.financeTransaction.create({
			data: {
				date: new Date(),
				type: 'INCOME',
				amountCents: price * 100,
				counterparty: speaker.name || '未命名',
				note: `${eventDate}${speaker.event?.title || '活動'} - 講師繳費`,
				categoryId: category.id,
				eventId: eventId
			}
		})

		revalidatePath(`/admin/checkin/${eventId}`)
	}

	// 講師取消繳費
	async function markSpeakerUnpaid(formData: FormData) {
		'use server'
		const speakerId = String(formData.get('speakerId'))
		if (!speakerId) return

		const speaker = await prisma.speakerBooking.findUnique({
			where: { id: speakerId },
			include: { event: true }  // 包含 event 資料
		})
		if (!speaker) return

		// 更新繳費狀態
		await prisma.speakerBooking.update({
			where: { id: speakerId },
			data: { paymentStatus: 'UNPAID' }
		})

		// 刪除對應的財務記錄
		const eventDate = speaker.event?.startAt ? 
			new Date(speaker.event.startAt).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }).replace('/', '/') : 
			''
		await prisma.financeTransaction.deleteMany({
			where: {
				eventId: eventId,
				counterparty: speaker.name || '未命名',
				note: { contains: `${eventDate}${speaker.event?.title || '活動'} - 講師繳費` }
			}
		})

		revalidatePath(`/admin/checkin/${eventId}`)
	}

	// 講師簽到
	async function checkInSpeaker(formData: FormData) {
		'use server'
		const speakerId = String(formData.get('speakerId'))
		if (!speakerId) return

		await prisma.speakerBooking.update({
			where: { id: speakerId },
			data: { checkedInAt: new Date() }
		})
		revalidatePath(`/admin/checkin/${eventId}`)
	}

	// 統計資料
	const totalCount = registrations.length + speakers.length
	const checkedInCount = registrations.filter(r => r.checkedInAt).length + speakers.filter(s => s.checkedInAt).length
	const unpaidCount = registrations.filter(r => r.paymentStatus === 'UNPAID').length + speakers.filter(s => s.paymentStatus === 'UNPAID').length

	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">簽到管理</h1>
					<p className="text-gray-600">{event.title} · {format(event.startAt, 'yyyy/MM/dd（EEEEE） HH:mm', { locale: zhTW })}</p>
				</div>
				<Button as={Link} href={`/hall/${eventId}`} variant="outline">返回活動</Button>
			</div>

			{/* 統計卡片 */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-blue-50 p-4 rounded-lg">
					<div className="text-blue-600 font-medium">總報名數</div>
					<div className="text-2xl font-semibold text-blue-700">{totalCount}</div>
				</div>
				<div className="bg-green-50 p-4 rounded-lg">
					<div className="text-green-600 font-medium">已簽到</div>
					<div className="text-2xl font-semibold text-green-700">{checkedInCount}</div>
				</div>
				<div className="bg-orange-50 p-4 rounded-lg">
					<div className="text-orange-600 font-medium">未繳費</div>
					<div className="text-2xl font-semibold text-orange-700">{unpaidCount}</div>
				</div>
			</div>

			{/* 報名列表 */}
			<div className="bg-white rounded-lg border">
				<div className="p-4 border-b">
					<h2 className="font-medium">報名列表</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left font-medium">姓名</th>
								<th className="px-4 py-3 text-left font-medium">類型</th>
								<th className="px-4 py-3 text-left font-medium">公司/產業</th>
								<th className="px-4 py-3 text-left font-medium">聯絡方式</th>
								<th className="px-4 py-3 text-center font-medium">金額</th>
								<th className="px-4 py-3 text-center font-medium">簽到狀態</th>
								<th className="px-4 py-3 text-center font-medium">繳費狀態</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{/* 成員和來賓 */}
							{registrations.map(registration => {
								const price = getPrice(registration)
								const displayName = registration.user?.name || registration.name || '未命名'
								
								return (
									<tr key={registration.id}>
										<td className="px-4 py-3 font-medium">{displayName}</td>
										<td className="px-4 py-3">
											<span className={`px-2 py-1 rounded text-xs ${
												registration.role === 'MEMBER' 
													? 'bg-blue-100 text-blue-700' 
													: 'bg-purple-100 text-purple-700'
											}`}>
												{registration.role === 'MEMBER' ? '成員' : '來賓'}
											</span>
										</td>
										<td className="px-4 py-3 text-gray-600">
											<div>{registration.companyName || '-'}</div>
											<div className="text-xs">{registration.industry || ''}</div>
										</td>
										<td className="px-4 py-3 text-gray-600">
											<div>{registration.phone || '-'}</div>
											<div className="text-xs">{registration.user?.name ? '會員' : '來賓'}</div>
										</td>
										<td className="px-4 py-3 text-center font-medium">
											NT$ {price}
										</td>
										<td className="px-4 py-3 text-center">
											{registration.checkedInAt ? (
												<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
													已簽到
												</span>
											) : canCheckin ? (
												<form action={checkIn} className="inline">
													<input type="hidden" name="registrationId" value={registration.id} />
													<Button type="submit" variant="outline" size="sm">
														未簽到
													</Button>
												</form>
											) : (
												<span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
													未簽到
												</span>
											)}
										</td>
										<td className="px-4 py-3 text-center">
											{(() => {
												const paymentStatus = getPaymentStatus(registration)
												
												if (paymentStatus.status === 'monthly_paid') {
													return (
														<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
															{paymentStatus.text}
														</span>
													)
												} else if (paymentStatus.status === 'monthly_unpaid') {
													return (
														<span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
															{paymentStatus.text}
														</span>
													)
												} else if (paymentStatus.status === 'paid') {
													return canPayment ? (
														<form action={markUnpaid} className="inline">
															<input type="hidden" name="registrationId" value={registration.id} />
															<Button 
																type="submit" 
																variant="secondary" 
																size="sm"
																className="bg-green-100 text-green-700 hover:bg-green-200"
															>
																{paymentStatus.text}
															</Button>
														</form>
													) : (
														<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
															{paymentStatus.text}
														</span>
													)
												} else {
													return canPayment ? (
														<form action={markPaid} className="inline">
															<input type="hidden" name="registrationId" value={registration.id} />
															<Button 
																type="submit" 
																variant="secondary" 
																size="sm"
																className="bg-orange-100 text-orange-700 hover:bg-orange-200"
															>
																{paymentStatus.text}
															</Button>
														</form>
													) : (
														<span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
															{paymentStatus.text}
														</span>
													)
												}
											})()}
										</td>
									</tr>
								)
							})}
							
							{/* 講師 */}
							{speakers.map(speaker => (
								<tr key={`speaker-${speaker.id}`}>
									<td className="px-4 py-3 font-medium">{speaker.name}</td>
									<td className="px-4 py-3">
										<span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
											講師
										</span>
									</td>
									<td className="px-4 py-3 text-gray-600">
										<div>{speaker.companyName || '-'}</div>
										<div className="text-xs">{speaker.industry || ''}</div>
									</td>
									<td className="px-4 py-3 text-gray-600">
										<div>{speaker.phone || '-'}</div>
										<div className="text-xs">講師</div>
									</td>
									<td className="px-4 py-3 text-center font-medium">
										NT$ {(() => {
											const eventType = event?.type as EventType
											if (['GENERAL', 'JOINT', 'CLOSED'].includes(eventType)) {
												return 250 // 講師固定價格
											} else if (eventType === 'BOD') {
												return (event?.bodMemberPriceCents || 0) / 100
											} else if (['DINNER', 'SOFT'].includes(eventType)) {
												return (event?.defaultPriceCents || 0) / 100
											}
											return 0
										})()}
									</td>
									<td className="px-4 py-3 text-center">
										{speaker.checkedInAt ? (
											<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
												已簽到
											</span>
										) : canCheckin ? (
											<form action={checkInSpeaker} className="inline">
												<input type="hidden" name="speakerId" value={speaker.id} />
												<Button type="submit" variant="outline" size="sm">
													未簽到
												</Button>
											</form>
										) : (
											<span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
												未簽到
											</span>
										)}
									</td>
									<td className="px-4 py-3 text-center">
										{speaker.paymentStatus === 'PAID' ? (
											canPayment ? (
												<form action={markSpeakerUnpaid} className="inline">
													<input type="hidden" name="speakerId" value={speaker.id} />
													<Button 
														type="submit" 
														variant="secondary" 
														size="sm"
														className="bg-green-100 text-green-700 hover:bg-green-200"
													>
														已繳費
													</Button>
												</form>
											) : (
												<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
													已繳費
												</span>
											)
										) : canPayment ? (
											<form action={markSpeakerPaid} className="inline">
												<input type="hidden" name="speakerId" value={speaker.id} />
												<Button 
													type="submit" 
													variant="secondary" 
													size="sm"
													className="bg-orange-100 text-orange-700 hover:bg-orange-200"
												>
													未繳費
												</Button>
											</form>
										) : (
											<span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
												未繳費
											</span>
										)}
									</td>
								</tr>
							))}
							
							{registrations.length === 0 && speakers.length === 0 && (
								<tr>
									<td colSpan={7} className="px-4 py-8 text-center text-gray-500">
										暫無報名記錄
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	)
}
