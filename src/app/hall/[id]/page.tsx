import { prisma } from '@/lib/prisma'
import { EventType } from '@prisma/client'
import Link from 'next/link'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import ConfirmDelete from '@/components/ConfirmDelete'
import { Calendar as CalendarIcon, MapPin, Ticket } from 'lucide-react'
import { getDisplayName } from '@/lib/displayName'
import SharePopover from './SharePopover'

const TYPE_LABEL: Record<EventType, string> = {
	GENERAL: '簡報組聚',
	CLOSED: '封閉組聚',
	BOD: 'BOD 擴大商機日',
	DINNER: '餐敘組聚',
	JOINT: '聯合組聚',
	SOFT: '軟性活動',
	VISIT: '職業參訪',
}

export default async function HallEventDetailPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
	const { id } = await params
	const sp = searchParams ? await searchParams : undefined
	const event = await prisma.event.findUnique({ where: { id } })
	if (!event) return <div className="max-w-3xl mx-auto p-4">找不到活動</div>

	const session = await getServerSession(authOptions)
	if (!session?.user) {
		// 未登入導向登入頁，並帶回跳轉
		const q = new URLSearchParams()
		q.set('callbackUrl', `/hall/${id}`)
		redirect(`/auth/signin?${q.toString()}`)
	}
	const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles) ?? []
	const canEditDelete = roles.includes('admin' as Role) || roles.includes('event_manager' as Role)
	const canCheckin = true // 所有人都可以進入簽到管理
	const isLoggedIn = !!session?.user

	// 獲取當前用戶資訊
	const currentUser = session?.user?.email ? await prisma.user.findUnique({
		where: { email: session.user.email }
	}) : null

	const [regs, speakers, eventMenu, orgSettings] = await Promise.all([
		prisma.registration.findMany({ where: { eventId: id }, orderBy: { createdAt: 'asc' }, include: { user: { select: { name: true, nickname: true } } } }),
		prisma.speakerBooking.findMany({ where: { eventId: id }, orderBy: { createdAt: 'asc' } }),
		prisma.eventMenu.findUnique({ where: { eventId: id } }),
		prisma.orgSettings.findFirst()
	])

	// 智能選擇：為沒有 mealCode 但活動有餐點設定的報名記錄自動分配餐點
	if (eventMenu?.hasMealService) {
		const needsAutoAssignment = regs.filter(reg => !reg.mealCode)
		
		if (needsAutoAssignment.length > 0) {
			// 批量更新所有需要智能選擇的報名記錄
			const updates = needsAutoAssignment.map(reg => {
				let finalMealCode = ''
				let diet = 'meat'

				// 智能選擇邏輯
				if (reg.noBeef && reg.noPork) {
					// 不吃牛也不吃豬 → 選素食 C
					finalMealCode = 'C'
					diet = 'veg'
				} else {
					// 葷食，需要智能選擇 A 或 B
					const canEatA = !(reg.noBeef && eventMenu.mealAHasBeef) && !(reg.noPork && eventMenu.mealAHasPork)
					const canEatB = !(reg.noBeef && eventMenu.mealBHasBeef) && !(reg.noPork && eventMenu.mealBHasPork)
					
					if (canEatA && canEatB) {
						// 兩個都可以吃，選擇 A（可以之後優化為選人數較少的）
						finalMealCode = 'A'
					} else if (canEatA) {
						finalMealCode = 'A'
					} else if (canEatB) {
						finalMealCode = 'B'
					} else {
						// 都不能吃，選素食 C
						finalMealCode = 'C'
						diet = 'veg'
					}
				}

				return prisma.registration.update({
					where: { id: reg.id },
					data: {
						mealCode: finalMealCode,
						diet
					}
				})
			})

			// 執行批量更新
			await Promise.all(updates)

			// 重新查詢更新後的資料
			const updatedRegs = await prisma.registration.findMany({ 
				where: { eventId: id }, 
				orderBy: { createdAt: 'asc' }, 
				include: { user: { select: { name: true, nickname: true } } } 
			})
			
			// 更新 regs 變數
			regs.splice(0, regs.length, ...updatedRegs)
		}

		// 同樣為講師預約進行智能選擇
		const speakersNeedsAutoAssignment = speakers.filter(speaker => !speaker.mealCode)
		
		if (speakersNeedsAutoAssignment.length > 0) {
			const speakerUpdates = speakersNeedsAutoAssignment.map(speaker => {
				let finalMealCode = ''
				let diet = 'meat'

				// 智能選擇邏輯
				if (speaker.noBeef && speaker.noPork) {
					// 不吃牛也不吃豬 → 選素食 C
					finalMealCode = 'C'
					diet = 'veg'
				} else {
					// 葷食，需要智能選擇 A 或 B
					const canEatA = !(speaker.noBeef && eventMenu.mealAHasBeef) && !(speaker.noPork && eventMenu.mealAHasPork)
					const canEatB = !(speaker.noBeef && eventMenu.mealBHasBeef) && !(speaker.noPork && eventMenu.mealBHasPork)
					
					if (canEatA && canEatB) {
						// 兩個都可以吃，選擇 A
						finalMealCode = 'A'
					} else if (canEatA) {
						finalMealCode = 'A'
					} else if (canEatB) {
						finalMealCode = 'B'
					} else {
						// 都不能吃，選素食 C
						finalMealCode = 'C'
						diet = 'veg'
					}
				}

				return prisma.speakerBooking.update({
					where: { id: speaker.id },
					data: {
						mealCode: finalMealCode,
						diet
					}
				})
			})

			// 執行批量更新
			await Promise.all(speakerUpdates)

			// 重新查詢更新後的講師資料
			const updatedSpeakers = await prisma.speakerBooking.findMany({ 
				where: { eventId: id }, 
				orderBy: { createdAt: 'asc' }
			})
			
			// 更新 speakers 變數
			speakers.splice(0, speakers.length, ...updatedSpeakers)
		}
	}

	// 分離報名狀態
	const registeredMembers = regs.filter(r => r.role === 'MEMBER' && r.status === 'REGISTERED')
	const leftMembers = regs.filter(r => r.role === 'MEMBER' && r.status === 'LEAVE')
	const guests = regs.filter(r => r.role === 'GUEST')
	const members = registeredMembers // 保持向後兼容

	const checkedCount = registeredMembers.filter(r => r.checkedInAt != null).length + guests.filter(r => r.checkedInAt != null).length + speakers.filter(s => s.checkedInAt != null).length
	const totalCount = registeredMembers.length + guests.length + speakers.length

	// 檢查當前用戶的報名狀態（優先以 userId，其次以 phone 比對）
	const currentUserRegistration = currentUser ? regs.find(r => r.userId === currentUser.id || (currentUser.phone ? r.phone === currentUser.phone : false)) : null

	const hasLocks = regs.length > 0 || speakers.length > 0
	const memberNames = members.map(r => getDisplayName(r.user) || r.name || '-').slice(0, 30)
	const guestNames = guests.map(r => r.name || '-').slice(0, 30)
	const speakerNames = speakers.map(s => s.name).slice(0, 30)

	// 顯示費用資訊（僅在有設定金額時顯示）
	const formatCents = (v?: number | null) => {
		if (v == null || v <= 0) return ''
		const amt = v / 100
		const formatted = Number(amt).toLocaleString('zh-TW')
		return `${formatted} 元`
	}
	const priceParts: string[] = []
	// 一般活動類型：使用 defaultPriceCents / guestPriceCents
	if (event.type === 'GENERAL' || event.type === 'JOINT' || event.type === 'CLOSED' || event.type === 'DINNER' || event.type === 'SOFT' || event.type === 'VISIT') {
		const member = formatCents(event.defaultPriceCents)
		const guest = formatCents(event.guestPriceCents)
		if (member) priceParts.push(`成員 ${member}`)
		if (guest) priceParts.push(`來賓 ${guest}`)
	}
	// BOD 類型：支援 bod 專屬金額
	if (event.type === 'BOD') {
		const bodMember = formatCents(event.bodMemberPriceCents)
		const bodGuest = formatCents(event.bodGuestPriceCents)
		if (bodMember) priceParts.push(`成員 ${bodMember}`)
		if (bodGuest) priceParts.push(`來賓 ${bodGuest}`)
		// 若同時有一般欄位也一併顯示
		const member = formatCents(event.defaultPriceCents)
		const guest = formatCents(event.guestPriceCents)
		if (!bodMember && member) priceParts.push(`成員 ${member}`)
		if (!bodGuest && guest) priceParts.push(`來賓 ${guest}`)
	}
	const priceLabel = priceParts.join(' · ')

	async function deleteEvent(formData: FormData) {
		'use server'
		const eventId = String(formData.get('id'))
		if (!eventId) return
		// 先檢查是否有人報名或講師預約
		const [regList, spkList] = await Promise.all([
			prisma.registration.findMany({
				where: { eventId },
				select: { role: true, name: true, user: { select: { name: true } } },
				orderBy: { createdAt: 'asc' },
			}),
			prisma.speakerBooking.findMany({ where: { eventId }, select: { name: true }, orderBy: { createdAt: 'asc' } }),
		])

		if (regList.length > 0 || spkList.length > 0) {
			const memberNames = regList.filter(r => r.role === 'MEMBER').map(r => r.user?.name || r.name || '-').slice(0, 30)
			const guestNames = regList.filter(r => r.role === 'GUEST').map(r => r.name || '-').slice(0, 30)
			const speakerNames = spkList.map(s => s.name).slice(0, 30)
			const q = new URLSearchParams()
			q.set('cannotDelete', '1')
			if (memberNames.length) q.set('members', memberNames.join('、'))
			if (guestNames.length) q.set('guests', guestNames.join('、'))
			if (speakerNames.length) q.set('speakers', speakerNames.join('、'))
			redirect(`/hall/${eventId}?${q.toString()}`)
		}

		await prisma.$transaction([
			prisma.financeTransaction.deleteMany({ where: { eventId } }),
			prisma.financeLineItem.deleteMany({ where: { eventId } }),
			prisma.guestInvite.deleteMany({ where: { eventId } }),
			prisma.registration.deleteMany({ where: { eventId } }),
			prisma.speakerBooking.deleteMany({ where: { eventId } }),
			prisma.event.delete({ where: { id: eventId } }),
		])
		revalidatePath('/hall')
		revalidatePath('/admin/events')
		redirect('/hall')
	}

	return (
		<div className="max-w-3xl mx-auto p-4 space-y-6">
			{sp?.cannotDelete === '1' && (
				<div className="p-3 border border-red-200 bg-red-50 text-sm text-red-700 rounded">
					無法刪除：此活動已有報名或講師預約。
					{sp?.members ? <div>成員：{String(sp.members)}</div> : null}
					{sp?.guests ? <div>來賓：{String(sp.guests)}</div> : null}
					{sp?.speakers ? <div>講師：{String(sp.speakers)}</div> : null}
				</div>
			)}
			<div className="flex items-start justify-between">
				<div className="flex-1 min-w-0">
					<h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-2 pr-2">{event.title}</h1>
					{/* 來賓邀請按鈕 - 放在標題旁邊 */}
					{isLoggedIn && (() => {
						// 根據活動類型選擇對應的邀請訊息和卡片
						let invitationMessage = '磐石砌好厝誠摯地邀請您一同來參與'
						let invitationCardUrl: string | null = null
						
						if (orgSettings) {
							switch (event.type) {
								case 'GENERAL':
								case 'JOINT':
								case 'CLOSED':
									invitationMessage = orgSettings.invitationMessageGeneral || invitationMessage
									invitationCardUrl = orgSettings.invitationCardGeneral
									break
								case 'DINNER':
									invitationMessage = orgSettings.invitationMessageDinner || invitationMessage
									invitationCardUrl = orgSettings.invitationCardDinner
									break
								case 'SOFT':
									invitationMessage = orgSettings.invitationMessageSoft || invitationMessage
									invitationCardUrl = orgSettings.invitationCardSoft
									break
								case 'VISIT':
									invitationMessage = orgSettings.invitationMessageVisit || invitationMessage
									invitationCardUrl = orgSettings.invitationCardVisit
									break
								case 'BOD':
									invitationMessage = orgSettings.invitationMessageBod || invitationMessage
									invitationCardUrl = orgSettings.invitationCardBod
									break
							}
						}
						
						// 採用與 LINE 推播一致的日期/時間格式（伺服端產生，避免時區誤差）
						const eventDateLabel = format(event.startAt, 'yyyy/MM/dd（EEEEE）', { locale: zhTW })
						const eventTimeLabel = `${format(event.startAt, 'HH:mm', { locale: zhTW })}-${format(event.endAt, 'HH:mm', { locale: zhTW })}`
						// 來賓費用：GENERAL/JOINT 固定 250；其他依 event.guestPriceCents
						const guestPriceLabel = (() => {
							if (event.type === 'GENERAL' || event.type === 'JOINT') return '來賓 250 元'
							const cents = event.guestPriceCents
							if (cents && cents > 0) {
								const amt = (cents / 100).toLocaleString('zh-TW')
								return `來賓 ${amt} 元`
							}
							return ''
						})()
						if (event.type === 'CLOSED') return null
						return (
							<SharePopover 
								event={event}
								invitationMessage={invitationMessage}
								invitationCardUrl={invitationCardUrl}
								eventDateLabel={eventDateLabel}
								eventTimeLabel={eventTimeLabel}
								guestPriceLabel={guestPriceLabel}
							/>
						)
					})()}
				</div>
				{/* 右上角管理圖示按鈕 */}
				<div className="flex items-center gap-1 flex-shrink-0">
					{canEditDelete && (
						<Link 
							href={`/admin/events/${event.id}`} 
							className="text-gray-400 hover:text-gray-600 p-2"
							title="編輯活動"
						>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
						</Link>
					)}
					{canEditDelete && (
						<div title="刪除活動">
							<ConfirmDelete 
								eventId={event.id} 
								action={deleteEvent} 
								hasLocks={hasLocks} 
								members={memberNames} 
								guests={guestNames} 
								speakers={speakerNames}
								isIcon={true}
							/>
						</div>
					)}
				</div>
			</div>

			<div className="space-y-2 text-sm text-gray-700">
				<div className="flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-gray-500" />{format(event.startAt, 'yyyy/MM/dd（EEEEE） HH:mm', { locale: zhTW })} - {format(event.endAt, 'HH:mm', { locale: zhTW })}</div>
				{priceLabel && (
					<div className="flex items-center gap-2 text-gray-800">
						<Ticket className="w-4 h-4 text-gray-500" />
						<span>費用：{priceLabel}</span>
					</div>
				)}
				<div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{event.location ?? '-'}</div>
				<div>類別：{TYPE_LABEL[event.type as EventType]}</div>
				<div className="flex items-center gap-3">
					<span>報名資訊：已簽到 {checkedCount} / {totalCount}</span>
					{/* 簽到按鈕 - 放在報名資訊旁邊 */}
					{canCheckin && (
						<Button 
							as={Link} 
							href={`/admin/checkin/${event.id}`} 
							variant="primary" 
							size="sm"
						>
							簽到
						</Button>
					)}
				</div>
				{/* 活動內容（顯示於報名資訊下方） */}
				{event.content && (
					<div className="text-sm text-gray-800">
						<span className="font-medium">內容：</span>
						<span className="whitespace-pre-wrap">{event.content}</span>
					</div>
				)}
			</div>

			<div className="space-y-4">
				<Card>
					<CardContent>
						<div className="flex items-center justify-between mb-2">
							<h2 className="font-medium">講師（{speakers.length}）</h2>
							{canEditDelete ? (
								<Button as={Link} href={`/calendar/${event.id}`} variant="outline" size="sm">
									講師管理
								</Button>
							) : null}
						</div>
						<ul className="list-disc pl-5 text-sm text-gray-800">
							{speakers.map(s => {
								let mealInfo = ''
								if (eventMenu?.hasMealService) {
									if (s.mealCode) {
										// 有餐點設定且有 mealCode：顯示 A/B/C 及餐點名稱
										const mealName = s.mealCode === 'A' ? eventMenu.mealCodeA :
														 s.mealCode === 'B' ? eventMenu.mealCodeB :
														 s.mealCode === 'C' ? eventMenu.mealCodeC : null
										mealInfo = mealName ? ` · ${s.mealCode}餐（${mealName}）` : ` · ${s.mealCode}餐`
									} else {
										// 有餐點設定但沒有 mealCode（理論上不會發生）
										mealInfo = ' · 待分配'
									}
								} else {
									// 沒有餐點設定：顯示飲食偏好
									if (s.diet === 'veg') {
										mealInfo = ' · 素食'
									} else {
										const restrictions = []
										if (s.noBeef) restrictions.push('不吃牛')
										if (s.noPork) restrictions.push('不吃豬')
										if (restrictions.length > 0) {
											mealInfo = ` · 葷食（${restrictions.join('、')}）`
										} else {
											mealInfo = ' · 葷食'
										}
									}
								}
								
								return (
									<li key={s.id}>
										{[s.name, s.companyName, s.industry, s.bniChapter].filter(Boolean).join(' · ')}{mealInfo}
									</li>
								)
							})}
						</ul>
					</CardContent>
				</Card>
				
				<Card>
					<CardContent>
						<div className="flex items-center justify-between mb-2">
							<h2 className="font-medium">內部成員（{members.length}）</h2>
							{canEditDelete ? (
								<Button as={Link} href={`/admin/member-management/${event.id}`} variant="outline" size="sm">
									成員管理
								</Button>
							) : null}
						</div>
						<ul className="list-disc pl-5 text-sm text-gray-800">
							{members.map(m => {
								let mealInfo = ''
								if (eventMenu?.hasMealService) {
									if (m.mealCode) {
										// 有餐點設定且有 mealCode：顯示 A/B/C 及餐點名稱
										const mealName = m.mealCode === 'A' ? eventMenu.mealCodeA :
														 m.mealCode === 'B' ? eventMenu.mealCodeB :
														 m.mealCode === 'C' ? eventMenu.mealCodeC : null
										mealInfo = mealName ? ` - ${m.mealCode}餐（${mealName}）` : ` - ${m.mealCode}餐`
									} else {
										// 有餐點設定但沒有 mealCode（理論上不會發生）
										mealInfo = ' - 待分配'
									}
								} else {
									// 沒有餐點設定：顯示飲食偏好
									if (m.diet === 'veg') {
										mealInfo = ' - 素食'
									} else {
										const restrictions = []
										if (m.noBeef) restrictions.push('不吃牛')
										if (m.noPork) restrictions.push('不吃豬')
										if (restrictions.length > 0) {
											mealInfo = ` - 葷食（${restrictions.join('、')}）`
										} else {
											mealInfo = ' - 葷食'
										}
									}
								}
								
								return (
									<li key={m.id}>
										{getDisplayName(m.user) || m.name || '-'}{mealInfo}
									</li>
								)
							})}
						</ul>
					</CardContent>
				</Card>
				
				{/* 請假名單 */}
				{leftMembers.length > 0 && (
					<Card>
						<CardContent>
							<h2 className="font-medium mb-2">請假名單（{leftMembers.length}）</h2>
							<div className="text-sm text-gray-600">
								{leftMembers.map(member => (
									<span key={member.id} className="inline-block mr-3 mb-2">
										{getDisplayName(member.user) || member.name || '-'}
									</span>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				<Card>
					<CardContent>
						<div className="flex items-center justify-between mb-2">
							<h2 className="font-medium">來賓（{guests.length}）</h2>
							{canEditDelete ? (
								<Button as={Link} href={`/admin/guest-management/${event.id}`} variant="outline" size="sm">
									來賓管理
								</Button>
							) : null}
						</div>
						<ul className="list-disc pl-5 text-sm text-gray-800">
							{guests.map(g => {
								let mealInfo = ''
								if (eventMenu?.hasMealService) {
									if (g.mealCode) {
										// 有餐點設定且有 mealCode：顯示 A/B/C 及餐點名稱
										const mealName = g.mealCode === 'A' ? eventMenu.mealCodeA :
														 g.mealCode === 'B' ? eventMenu.mealCodeB :
														 g.mealCode === 'C' ? eventMenu.mealCodeC : null
										mealInfo = mealName ? ` · ${g.mealCode}餐（${mealName}）` : ` · ${g.mealCode}餐`
									} else {
										// 有餐點設定但沒有 mealCode（理論上不會發生）
										mealInfo = ' · 待分配'
									}
								} else {
									// 沒有餐點設定：顯示飲食偏好
									if (g.diet === 'veg') {
										mealInfo = ' · 素食'
									} else {
										const restrictions = []
										if (g.noBeef) restrictions.push('不吃牛')
										if (g.noPork) restrictions.push('不吃豬')
										if (restrictions.length > 0) {
											mealInfo = ` · 葷食（${restrictions.join('、')}）`
										} else {
											mealInfo = ' · 葷食'
										}
									}
								}
								
								return (
									<li key={g.id}>
										{[g.name, g.companyName, g.industry, g.bniChapter].filter(Boolean).join(' · ')}{mealInfo}
									</li>
								)
							})}
						</ul>
					</CardContent>
				</Card>
			</div>

			{/* 主要操作按鈕 - 頁面最下方 */}
			{isLoggedIn && (
				<div className="flex flex-col sm:flex-row items-center gap-3 justify-center py-6 border-t">
					{!currentUserRegistration || currentUserRegistration.status === 'LEAVE' ? (
						<Button 
							as={Link} 
							href={`/events/${event.id}/register`} 
							variant="primary"
							size="sm"
							className="w-full sm:w-auto min-h-[44px]"
						>
							報名
						</Button>
					) : (
						<Button 
							as={Link} 
							href={`/events/${event.id}/leave`} 
							variant="outline" 
							size="sm"
							className="w-full sm:w-auto min-h-[44px]"
						>
							請假
						</Button>
					)}
				</div>
			)}

			<div className="text-center">
				<Link href="/hall" className="text-blue-600 underline text-sm">返回活動大廳</Link>
			</div>
		</div>
	)
}



