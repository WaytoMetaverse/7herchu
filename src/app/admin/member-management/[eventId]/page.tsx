import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { Role } from '@prisma/client'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { getDisplayName } from '@/lib/displayName'
import { revalidatePath } from 'next/cache'

export const metadata = {
	title: '成員管理',
	themeColor: '#ffffff',
	viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default async function MemberManagementPage({ params }: { params: Promise<{ eventId: string }> }) {
	const { eventId } = await params
	
	const session = await getServerSession(authOptions)
	if (!session?.user?.email) redirect('/auth/signin')

	const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles) ?? []
	const canManage = roles.includes('admin') || roles.includes('event_manager')

	if (!canManage) {
		return (
			<div className="max-w-3xl mx-auto p-4">
				<div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4">
					<h1 className="text-lg font-medium mb-1">無權限</h1>
					<p className="text-sm">您沒有權限進行成員管理操作。如需調整，請聯繫管理員。</p>
					<div className="mt-3">
						<Link href="/group" className="text-blue-600 hover:text-blue-800 underline">返回小組管理</Link>
					</div>
				</div>
			</div>
		)
	}

	const event = await prisma.event.findUnique({ where: { id: eventId } })
	if (!event) notFound()

	// 取得該活動的所有內部成員報名記錄（包含 MEMBER 和 SPEAKER）
	const registrations = await prisma.registration.findMany({
		where: { 
			eventId,
			role: { in: ['MEMBER', 'SPEAKER'] }
		},
		orderBy: { createdAt: 'asc' },
		include: { 
			user: { 
				select: { 
					id: true,
					name: true, 
					nickname: true,
					email: true,
					phone: true
				} 
			} 
		}
	})

	// 取得所有活躍成員
	const allMembers = await prisma.user.findMany({
		where: {
			isActive: true,
			memberProfile: {
				isNot: null
			}
		},
		select: {
			id: true,
			name: true,
			nickname: true,
			email: true,
			phone: true
		}
	})

	// 找出未回應的成員（沒有報名也沒有請假）
	// 注意：要包含所有角色（MEMBER 和 SPEAKER）
	const registeredUserIds = new Set(registrations.map(r => r.userId).filter(Boolean))
	const noResponseMembers = allMembers.filter(m => !registeredUserIds.has(m.id))

	// 取得活動餐點設定
	const eventMenu = await prisma.eventMenu.findUnique({
		where: { eventId }
	})

	// 分離不同狀態的成員
	const registeredMembers = registrations.filter(r => r.status === 'REGISTERED' && r.role === 'MEMBER')
	const leftMembers = registrations.filter(r => r.status === 'LEAVE')
	const speakerMembers = registrations.filter(r => r.role === 'SPEAKER') // 內部成員講師

	// 檢查講師名額是否已滿
	const [externalSpeakersCount] = await Promise.all([
		prisma.speakerBooking.count({ where: { eventId } })
	])
	const totalSpeakers = externalSpeakersCount + speakerMembers.length
	const isSpeakerQuotaFull = event.speakerQuota !== null && event.speakerQuota !== undefined && totalSpeakers >= event.speakerQuota

	// 刪除成員報名記錄
	async function deleteRegistration(formData: FormData) {
		'use server'
		const registrationId = String(formData.get('registrationId'))
		if (!registrationId) return

		await prisma.registration.delete({
			where: { id: registrationId }
		})

		revalidatePath(`/admin/member-management/${eventId}`)
		revalidatePath(`/hall/${eventId}`)
	}

	// 修改成員狀態（報名/請假）
	async function toggleRegistrationStatus(formData: FormData) {
		'use server'
		const registrationId = String(formData.get('registrationId'))
		const newStatus = String(formData.get('newStatus'))
		if (!registrationId || !newStatus) return

		await prisma.registration.update({
			where: { id: registrationId },
			data: { status: newStatus as 'REGISTERED' | 'LEAVE' }
		})

		revalidatePath(`/admin/member-management/${eventId}`)
		revalidatePath(`/hall/${eventId}`)
	}

	// 指派成員為講師
	async function assignAsSpeaker(formData: FormData) {
		'use server'
		const registrationId = String(formData.get('registrationId'))
		if (!registrationId) return

		// 檢查講師名額
		const evt = await prisma.event.findUnique({ where: { id: eventId } })
		if (!evt) return

		// 如果有設定講師名額限制，需要檢查
		if (evt.speakerQuota !== null && evt.speakerQuota !== undefined) {
			// 計算當前講師總數（外部 + 內部）
			const [externalSpeakersCount, internalSpeakersCount] = await Promise.all([
				prisma.speakerBooking.count({ where: { eventId } }),
				prisma.registration.count({ where: { eventId, role: 'SPEAKER' } })
			])
			
			const totalSpeakers = externalSpeakersCount + internalSpeakersCount
			
			// 如果已達名額上限，不允許新增
			if (totalSpeakers >= evt.speakerQuota) {
				console.log(`[assignAsSpeaker] 講師名額已滿 ${totalSpeakers}/${evt.speakerQuota}`)
				return // 靜默失敗，不顯示錯誤（因為按鈕應該被禁用）
			}
		}

		await prisma.registration.update({
			where: { id: registrationId },
			data: { role: 'SPEAKER' }
		})

		revalidatePath(`/admin/member-management/${eventId}`)
		revalidatePath(`/hall/${eventId}`)
	}

	// 取消講師，改回成員
	async function removeFromSpeaker(formData: FormData) {
		'use server'
		const registrationId = String(formData.get('registrationId'))
		if (!registrationId) return

		await prisma.registration.update({
			where: { id: registrationId },
			data: { role: 'MEMBER' }
		})

		revalidatePath(`/admin/member-management/${eventId}`)
		revalidatePath(`/hall/${eventId}`)
	}

	// 發送未回應提醒（只發給未回應成員）
	async function sendNoResponseReminder() {
		'use server'
		
		const { sendPushNotificationToUser } = await import('@/lib/webpush')
		const { format } = await import('date-fns')
		const { zhTW } = await import('date-fns/locale')
		
		const evt = await prisma.event.findUnique({ where: { id: eventId } })
		if (!evt) return

		// 重新查詢未回應成員
		const allMembers = await prisma.user.findMany({
			where: {
				isActive: true,
				memberProfile: {
					isNot: null
				}
			},
			select: {
				id: true
			}
		})

		const regs = await prisma.registration.findMany({
			where: { 
				eventId,
				role: { in: ['MEMBER', 'SPEAKER'] }
			},
			select: {
				userId: true
			}
		})

		const registeredUserIds = new Set(regs.map(r => r.userId).filter(Boolean))
		const noResponseMemberIds = allMembers
			.filter(m => !registeredUserIds.has(m.id))
			.map(m => m.id)

		if (noResponseMemberIds.length === 0) {
			console.log('[NoResponse] 沒有未回應成員')
			return
		}

		const dateLabel = format(evt.startAt, 'MM/dd（EEEEE）HH:mm', { locale: zhTW })
		
		// 逐一發送推播給未回應成員
		const results = await Promise.allSettled(
			noResponseMemberIds.map(userId => 
				sendPushNotificationToUser(userId, {
					title: `📢 ${evt.title} 尚未回應`,
					body: `活動時間：${dateLabel}，請盡快回應報名或請假`,
					icon: '/logo.jpg',
					badge: '/logo.jpg',
					data: {
						url: `/hall/${eventId}`,
						eventId,
						type: 'no_response'
					}
				})
			)
		)

		const successCount = results.filter(r => r.status === 'fulfilled').length
		console.log(`[NoResponse] 發送提醒給 ${successCount}/${noResponseMemberIds.length} 位未回應成員`)

		revalidatePath(`/admin/member-management/${eventId}`)
	}

	return (
		<div className="max-w-4xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">成員管理</h1>
					<div className="text-gray-600 mt-1">
						<div className="font-medium">{event.title}</div>
						<div className="text-sm">
							{format(event.startAt, 'yyyy/MM/dd（EEEEE） HH:mm', { locale: zhTW })}
						</div>
						<div className="text-sm">{event.location}</div>
					</div>
				</div>
				<Button as={Link} href={`/hall/${eventId}`} variant="outline">
					返回
				</Button>
			</div>

			{/* 統計資訊：同一行呈現 */}
			<div className="grid grid-cols-5 gap-2 text-xs sm:text-sm">
				<div className="bg-blue-50 p-3 rounded">
					<div className="text-blue-600">已報名</div>
					<div className="text-lg font-semibold text-blue-700">{registeredMembers.length}</div>
				</div>
				<div className="bg-purple-50 p-3 rounded">
					<div className="text-purple-600">講師</div>
					<div className="text-lg font-semibold text-purple-700">
						{totalSpeakers}
						{event.speakerQuota !== null && event.speakerQuota !== undefined && (
							<span className="text-sm font-normal">/{event.speakerQuota}</span>
						)}
					</div>
				</div>
				<div className="bg-yellow-50 p-3 rounded">
					<div className="text-yellow-600">請假</div>
					<div className="text-lg font-semibold text-yellow-700">{leftMembers.length}</div>
				</div>
				<div className="bg-orange-50 p-3 rounded">
					<div className="text-orange-600">未回應</div>
					<div className="text-lg font-semibold text-orange-700">{noResponseMembers.length}</div>
				</div>
				<div className="bg-gray-50 p-3 rounded">
					<div className="text-gray-600">總成員</div>
					<div className="text-lg font-semibold text-gray-700">{allMembers.length}</div>
				</div>
			</div>

			{/* 已報名成員列表 */}
			<div className="bg-white rounded-lg shadow">
				<div className="p-4 border-b">
					<h2 className="text-lg font-medium">已報名成員（{registeredMembers.length}）</h2>
				</div>
				<div className="p-4">
					{registeredMembers.length === 0 ? (
						<div className="text-gray-500 text-center py-8">尚無成員報名</div>
					) : (
						<div className="space-y-2.5">
							{registeredMembers.map(reg => {
								let mealInfo = ''
								if (eventMenu?.hasMealService) {
									if (reg.mealCode) {
										mealInfo = ` - ${reg.mealCode}餐`
									} else {
										mealInfo = ' - 待分配'
									}
								} else {
									if (reg.diet === 'veg') {
										mealInfo = ' - 素食'
									} else {
										const restrictions = []
										if (reg.noBeef) restrictions.push('不吃牛')
										if (reg.noPork) restrictions.push('不吃豬')
										if (restrictions.length > 0) {
											mealInfo = ` - 葷食（${restrictions.join('、')}）`
										} else {
											mealInfo = ' - 葷食'
										}
									}
								}

								return (
									<div key={reg.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg">
										<div className="flex-1">
											<div className="font-medium text-sm sm:text-base">
												{getDisplayName(reg.user) || reg.name || '-'}{mealInfo}
											</div>
											<div className="text-xs sm:text-sm text-gray-600">
												{reg.user?.email} · {reg.phone}
											</div>
											<div className="text-[10px] sm:text-xs text-gray-500">
												報名時間：{format(reg.createdAt, 'MM/dd HH:mm')}
												{reg.checkedInAt && (
													<span> · 簽到時間：{format(reg.checkedInAt, 'MM/dd HH:mm')}</span>
												)}
											</div>
										</div>
										<div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
											<form action={assignAsSpeaker}>
												<input type="hidden" name="registrationId" value={reg.id} />
												<Button 
													type="submit" 
													variant="secondary" 
													size="sm" 
													className="whitespace-nowrap"
													disabled={isSpeakerQuotaFull}
													title={isSpeakerQuotaFull ? `講師名額已滿 (${totalSpeakers}/${event.speakerQuota})` : ''}
												>
													指派為講師
												</Button>
											</form>
											<form action={toggleRegistrationStatus}>
												<input type="hidden" name="registrationId" value={reg.id} />
												<input type="hidden" name="newStatus" value="LEAVE" />
												<Button type="submit" variant="outline" size="sm" className="whitespace-nowrap">
													設為請假
												</Button>
											</form>
											<form action={deleteRegistration}>
												<input type="hidden" name="registrationId" value={reg.id} />
												<Button type="submit" variant="outline" size="sm" className="text-red-600 hover:text-red-700 whitespace-nowrap">
													刪除
												</Button>
											</form>
										</div>
									</div>
								)
							})}
						</div>
					)}
				</div>
			</div>

			{/* 內部成員講師列表 */}
			{speakerMembers.length > 0 && (
				<div className="bg-white rounded-lg shadow">
					<div className="p-4 border-b">
						<h2 className="text-lg font-medium">內部成員講師（{speakerMembers.length}）</h2>
					</div>
					<div className="p-4">
						<div className="space-y-3">
							{speakerMembers.map(reg => {
								let mealInfo = ''
								if (eventMenu?.hasMealService) {
									if (reg.mealCode) {
										mealInfo = ` - ${reg.mealCode}餐`
									} else {
										mealInfo = ' - 待分配'
									}
								} else {
									if (reg.diet === 'veg') {
										mealInfo = ' - 素食'
									} else {
										const restrictions = []
										if (reg.noBeef) restrictions.push('不吃牛')
										if (reg.noPork) restrictions.push('不吃豬')
										if (restrictions.length > 0) {
											mealInfo = ` - 葷食（${restrictions.join('、')}）`
										} else {
											mealInfo = ' - 葷食'
										}
									}
								}

								return (
									<div key={reg.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg bg-purple-50">
										<div className="flex-1">
											<div className="font-medium text-sm sm:text-base">
												{getDisplayName(reg.user) || reg.name || '-'}{mealInfo}
											</div>
											<div className="text-xs sm:text-sm text-gray-600">
												{reg.user?.email} · {reg.phone}
											</div>
											<div className="text-[10px] sm:text-xs text-gray-500">
												指派時間：{format(reg.createdAt, 'MM/dd HH:mm')}
												{reg.checkedInAt && (
													<span> · 簽到時間：{format(reg.checkedInAt, 'MM/dd HH:mm')}</span>
												)}
											</div>
										</div>
										<div className="flex items-center gap-2">
											<form action={removeFromSpeaker}>
												<input type="hidden" name="registrationId" value={reg.id} />
												<Button type="submit" variant="outline" size="sm">
													取消講師
												</Button>
											</form>
											<form action={deleteRegistration}>
												<input type="hidden" name="registrationId" value={reg.id} />
												<Button type="submit" variant="outline" size="sm" className="text-red-600 hover:text-red-700">
													刪除
												</Button>
											</form>
										</div>
									</div>
								)
							})}
						</div>
					</div>
				</div>
			)}

			{/* 請假成員列表 */}
			{leftMembers.length > 0 && (
				<div className="bg-white rounded-lg shadow">
					<div className="p-4 border-b">
						<h2 className="text-lg font-medium">請假成員（{leftMembers.length}）</h2>
					</div>
					<div className="p-4">
						<div className="space-y-3">
							{leftMembers.map(reg => (
								<div key={reg.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg bg-yellow-50">
									<div className="flex-1">
										<div className="font-medium text-sm sm:text-base">
											{getDisplayName(reg.user) || reg.name || '-'}
										</div>
										<div className="text-xs sm:text-sm text-gray-600">
											{reg.user?.email} · {reg.phone}
										</div>
										<div className="text-[10px] sm:text-xs text-gray-500">
											請假時間：{format(reg.createdAt, 'MM/dd HH:mm')}
										</div>
									</div>
									<div className="flex items-center gap-2">
										<form action={toggleRegistrationStatus}>
											<input type="hidden" name="registrationId" value={reg.id} />
											<input type="hidden" name="newStatus" value="REGISTERED" />
											<Button type="submit" variant="outline" size="sm">
												恢復報名
											</Button>
										</form>
										<form action={deleteRegistration}>
											<input type="hidden" name="registrationId" value={reg.id} />
											<Button type="submit" variant="outline" size="sm" className="text-red-600 hover:text-red-700">
												刪除
											</Button>
										</form>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{/* 未回應成員列表 */}
			{noResponseMembers.length > 0 && (
				<div className="bg-white rounded-lg shadow">
					<div className="p-4 border-b flex items-center justify-between">
						<h2 className="text-lg font-medium">尚未回應（{noResponseMembers.length}）</h2>
						<form action={sendNoResponseReminder}>
							<Button type="submit" variant="primary" size="sm">
								📢 提醒全部
							</Button>
						</form>
					</div>
					<div className="p-4">
						<div className="space-y-2">
							{noResponseMembers.map(member => (
								<div key={member.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg bg-orange-50">
									<div className="flex-1">
										<div className="font-medium text-sm sm:text-base">
											{getDisplayName(member) || '-'}
										</div>
										<div className="text-xs sm:text-sm text-gray-600">
											{member.email} {member.phone ? `· ${member.phone}` : ''}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
