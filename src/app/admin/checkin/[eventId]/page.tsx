import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
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

	const [registrations, speakers] = await Promise.all([
		prisma.registration.findMany({
			where: { eventId },
			include: { user: { select: { name: true, nickname: true } } },
			orderBy: [{ role: 'asc' }, { createdAt: 'asc' }]
		}),
		prisma.speakerBooking.findMany({
			where: { eventId },
			orderBy: { createdAt: 'asc' }
		})
	])

	// 計算活動價格
	function getPrice(registration: typeof registrations[0]): number {
		const isLoggedIn = !!registration.userId
		const eventType = event?.type as EventType
		if (!event) return 0

		// 固定價格活動
		if (['GENERAL', 'JOINT', 'CLOSED'].includes(eventType)) {
			if (isLoggedIn) {
				// 登入用戶：檢查成員類型
				// 這裡簡化處理，實際應該查詢 memberProfile.memberType
				return 180 // 固定成員價格
			} else {
				return 250 // 來賓價格
			}
		}

		// 變動價格活動
		if (eventType === 'BOD') {
			return isLoggedIn ? (event.bodMemberPriceCents || 0) / 100 : (event.bodGuestPriceCents || 0) / 100
		}

		if (['DINNER', 'SOFT'].includes(eventType)) {
			return isLoggedIn ? (event.defaultPriceCents || 0) / 100 : (event.guestPriceCents || 0) / 100
		}

		return 0
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

		const registration = await prisma.registration.findUnique({
			where: { id: registrationId },
			include: { user: { include: { memberProfile: true } } }
		})
		if (!registration) return

		const price = getPrice(registration)
		const isLoggedIn = !!registration.userId

		// 更新繳費狀態
		await prisma.registration.update({
			where: { id: registrationId },
			data: { paymentStatus: 'PAID' }
		})

		// 確保財務分類存在
		const categoryName = isLoggedIn ? '組聚收入' : '來賓收入'
		let category = await prisma.financeCategory.findFirst({ where: { name: categoryName } })
		if (!category) {
			category = await prisma.financeCategory.create({
				data: { name: categoryName, type: 'INCOME', system: true }
			})
		}

		// 新增財務交易記錄
		await prisma.financeTransaction.create({
			data: {
				date: new Date(),
				type: 'INCOME',
				amountCents: price * 100,
				counterparty: registration.user?.name || registration.name || '未命名',
				note: `${event?.title || '活動'} - ${registration.role === 'MEMBER' ? '成員' : '來賓'}繳費`,
				categoryId: category.id,
				eventId: eventId
			}
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
											{registration.paymentStatus === 'PAID' ? (
												<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
													繳費
												</span>
											) : canPayment ? (
												<form action={markPaid} className="inline">
													<input type="hidden" name="registrationId" value={registration.id} />
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
										NT$ 0
									</td>
									<td className="px-4 py-3 text-center">
										{speaker.checkedInAt ? (
											<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
												已簽到
											</span>
										) : canCheckin ? (
											<form action={async (formData: FormData) => {
												'use server'
												const speakerId = String(formData.get('speakerId'))
												if (!speakerId) return
												await prisma.speakerBooking.update({
													where: { id: speakerId },
													data: { checkedInAt: new Date() }
												})
												revalidatePath(`/admin/checkin/${eventId}`)
											}} className="inline">
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
											<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
												繳費
											</span>
										) : canPayment ? (
											<form action={async (formData: FormData) => {
												'use server'
												const speakerId = String(formData.get('speakerId'))
												if (!speakerId) return
												await prisma.speakerBooking.update({
													where: { id: speakerId },
													data: { paymentStatus: 'PAID' }
												})
												revalidatePath(`/admin/checkin/${eventId}`)
											}} className="inline">
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
