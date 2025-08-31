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
import { Calendar as CalendarIcon, MapPin } from 'lucide-react'
import { getDisplayName } from '@/lib/displayName'

const TYPE_LABEL: Record<EventType, string> = {
	GENERAL: '簡報組聚',
	CLOSED: '封閉組聚',
	BOD: 'BOD 擴大商機日',
	DINNER: '餐敘組聚',
	JOINT: '聯合組聚',
	SOFT: '軟性活動',
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

	const [regs, speakers, leaveRecords, eventMenu] = await Promise.all([
		prisma.registration.findMany({ where: { eventId: id }, orderBy: { createdAt: 'asc' }, include: { user: { select: { name: true, nickname: true } } } }),
		prisma.speakerBooking.findMany({ where: { eventId: id }, orderBy: { createdAt: 'asc' } }),
		prisma.leaveRecord.findMany({ where: { eventId: id }, orderBy: { leaveAt: 'asc' } }),
		prisma.eventMenu.findUnique({ where: { eventId: id } })
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

	const checkedCount = regs.filter(r => r.checkedInAt != null).length + speakers.filter(s => s.checkedInAt != null).length
	const totalCount = regs.length + speakers.length

	const members = regs.filter(r => r.role === 'MEMBER')
	const guests = regs.filter(r => r.role === 'GUEST')

	const hasLocks = regs.length > 0 || speakers.length > 0
	const memberNames = members.map(r => getDisplayName(r.user) || r.name || '-').slice(0, 30)
	const guestNames = guests.map(r => r.name || '-').slice(0, 30)
	const speakerNames = speakers.map(s => s.name).slice(0, 30)

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
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<h1 className="text-2xl lg:text-3xl font-semibold">{event.title}</h1>
					{/* 來賓邀請按鈕 - 放在標題旁邊 */}
					{isLoggedIn && (
						<Button as={Link} href={`/events/${event.id}/invite`} className="bg-[var(--brand-600)] hover:bg-[var(--brand-700)] text-white text-sm px-3 py-1 rounded-md">
							來賓邀請
						</Button>
					)}
				</div>
				{/* 右上角管理圖示按鈕 */}
				<div className="flex items-center gap-1">
					{canEditDelete && (
						<Link 
							href={`/admin/events/${event.id}`} 
							className="text-gray-400 hover:text-gray-600 p-1"
							title="編輯活動"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
				<div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{event.location ?? '-'}</div>
				<div>類別：{TYPE_LABEL[event.type as EventType]}</div>
				<div className="flex items-center gap-3">
					<span>報名資訊：已簽到 {checkedCount} / {totalCount}</span>
					{/* 簽到按鈕 - 放在報名資訊旁邊 */}
					{canCheckin && (
						<Button 
							as={Link} 
							href={`/admin/checkin/${event.id}`} 
							className="bg-[var(--brand-600)] hover:bg-[var(--brand-700)] text-white text-sm px-3 py-1 rounded-md"
						>
							簽到
						</Button>
					)}
				</div>
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
										// 有餐點設定且有 mealCode：顯示 A/B/C
										mealInfo = ` · ${s.mealCode}餐`
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
						<h2 className="font-medium mb-2">內部成員（{members.length}）</h2>
						<ul className="list-disc pl-5 text-sm text-gray-800">
							{members.map(m => {
								let mealInfo = ''
								if (eventMenu?.hasMealService) {
									if (m.mealCode) {
										// 有餐點設定且有 mealCode：顯示 A/B/C
										mealInfo = ` - ${m.mealCode}餐`
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
				{leaveRecords.length > 0 && (
					<Card>
						<CardContent>
							<h2 className="font-medium mb-2">請假名單（{leaveRecords.length}）</h2>
							<div className="text-sm text-gray-600">
								{leaveRecords.map(record => (
									<span key={record.id} className="inline-block mr-3 mb-2">
										{record.userName}
									</span>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				<Card>
					<CardContent>
						<h2 className="font-medium mb-2">來賓（{guests.length}）</h2>
						<ul className="list-disc pl-5 text-sm text-gray-800">
							{guests.map(g => {
								let mealInfo = ''
								if (eventMenu?.hasMealService) {
									if (g.mealCode) {
										// 有餐點設定且有 mealCode：顯示 A/B/C
										mealInfo = ` · ${g.mealCode}餐`
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
				<div className="flex items-center gap-3 justify-center py-6 border-t">
					<Button 
						as={Link} 
						href={`/events/${event.id}/register`} 
						className="bg-[var(--brand-600)] hover:bg-[var(--brand-700)] text-white text-sm px-4 py-1 rounded-md"
					>
						報名
					</Button>
					<Button 
						as={Link} 
						href={`/events/${event.id}/leave`} 
						className="bg-white border border-gray-300 text-slate-900 hover:bg-gray-50 text-sm px-4 py-1 rounded-md"
					>
						請假
					</Button>
				</div>
			)}

			<div className="text-center">
				<Link href="/hall" className="text-blue-600 underline text-sm">返回活動大廳</Link>
			</div>
		</div>
	)
}



