import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Calendar as CalendarIcon, MapPin } from 'lucide-react'

function ym(d: Date) { return format(d, 'yyyy-MM') }

export default async function HallPage() {
	const events = await prisma.event.findMany({ orderBy: { startAt: 'asc' } })

	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles) ?? []
	const canManage = roles.includes('admin' as Role) || roles.includes('event_manager' as Role)
	const isLoggedIn = !!(session?.user)

	// 目前登入者及其在各活動的報名/講師狀態（僅登入時）
	const currentUser = session?.user?.email
		? await prisma.user.findUnique({ where: { email: session.user.email } })
		: null
	const myRegs = currentUser
		? await prisma.registration.findMany({
				where: { userId: currentUser.id, eventId: { in: events.map(e => e.id) } },
				select: { eventId: true, role: true, status: true },
		  })
		: []
	const myRegByEvent: Record<string, { role: 'MEMBER' | 'GUEST' | 'SPEAKER'; status: 'REGISTERED' | 'LEAVE' }> = {}
	for (const r of myRegs) {
		// @ts-ignore
		myRegByEvent[r.eventId] = { role: r.role as any, status: r.status as any }
	}

	// 計算報名人數（成員 + 來賓）
	const registrationCounts = Object.fromEntries(
		(
			await prisma.registration.groupBy({
				by: ['eventId'],
				_count: { _all: true },
				where: { eventId: { in: events.map(e => e.id) }, status: 'REGISTERED' },
			})
		).map(g => [g.eventId, g._count._all])
	)

	// 計算講師人數
	const speakerCounts = Object.fromEntries(
		(
			await prisma.speakerBooking.groupBy({
				by: ['eventId'],
				_count: { _all: true },
				where: { eventId: { in: events.map(e => e.id) } },
			})
		).map(g => [g.eventId, g._count._all])
	)

	// 計算已簽到的報名人數（只統計已報名狀態）
	const registrationChecked = Object.fromEntries(
		(
			await prisma.registration.groupBy({
				by: ['eventId'],
				_count: { _all: true },
				where: { eventId: { in: events.map(e => e.id) }, status: 'REGISTERED', checkedInAt: { not: null } },
			})
		).map(g => [g.eventId, g._count._all])
	)

	// 計算已簽到的講師人數
	const speakerChecked = Object.fromEntries(
		(
			await prisma.speakerBooking.groupBy({
				by: ['eventId'],
				_count: { _all: true },
				where: { eventId: { in: events.map(e => e.id) }, checkedInAt: { not: null } },
			})
		).map(g => [g.eventId, g._count._all])
	)

	// 合併統計
	const counts: Record<string, number> = {}
	const checked: Record<string, number> = {}
	
	events.forEach(e => {
		counts[e.id] = (registrationCounts[e.id] ?? 0) + (speakerCounts[e.id] ?? 0)
		checked[e.id] = (registrationChecked[e.id] ?? 0) + (speakerChecked[e.id] ?? 0)
	})

	// 分群：今日與未來（asc）/ 過去（desc）
	const now = new Date()
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const upcoming = events.filter(e => e.startAt >= todayStart)
	const past = events.filter(e => e.startAt < todayStart).sort((a, b) => b.startAt.getTime() - a.startAt.getTime())
	// 依月份分組（僅用於即將與今日，保持 asc）
	const groups = new Map<string, typeof events>()
	upcoming.forEach(e => {
		const key = ym(e.startAt)
		if (!groups.has(key)) groups.set(key, [])
		groups.get(key)!.push(e)
	})

	return (
		<div className="max-w-3xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">活動大廳</h1>
				<div className="flex items-center gap-2">
					{canManage && <Button as={Link} href="/admin/events/new" variant="primary" size="sm" className="hidden sm:inline-flex">新增活動</Button>}
					{/* 手機板移除 + 按鈕 */}
					<Button as={Link} href="/mobile-query" variant="outline" size="sm" className="btn-mobile-xs">報名查詢</Button>
				</div>
			</div>
			{Array.from(groups.entries()).map(([key, list]) => (
				<section key={key} className="space-y-3">
					<h2 className="text-lg font-medium">{format(new Date(key + '-01'), 'yyyy/MM', { locale: zhTW })}</h2>
					<div className="space-y-3">
						{list.map((e) => (
							<Card key={e.id}>
								{isLoggedIn ? (
									<Link href={`/hall/${e.id}`}>
										<CardContent className="p-4 hover:bg-[color-mix(in_oklab,_var(--brand-600)_10%,_white)] rounded-xl">
											<div className="flex justify-between items-start">
												<div className="flex-1 min-w-0">
													{/* 行1（手機）：標題；（桌面）：日期 + 標題 */}
													<div className="font-medium mb-1 sm:mb-0">
														<div className="sm:hidden line-clamp-2">{e.title}</div>
														<div className="hidden sm:flex items-center gap-2">
															<CalendarIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
															<span>{format(e.startAt, 'MM/dd（EEEEE）', { locale: zhTW })}</span>
															<span className="truncate">{e.title}</span>
														</div>
													</div>
													{/* 行2（僅手機）：日期 */}
													<div className="sm:hidden text-sm text-gray-700 flex items-center gap-2 -mt-1 mb-1">
														<CalendarIcon className="w-4 h-4 flex-shrink-0" />
														<span>{format(e.startAt, 'MM/dd（EEEEE）', { locale: zhTW })}</span>
													</div>
													<div className="text-sm text-gray-700 flex items-center gap-2">
														<MapPin className="w-4 h-4 flex-shrink-0" />
														<span className="truncate">{e.location ?? ''}</span>
													</div>
												</div>
												<div className="text-sm text-gray-500 ml-2 whitespace-nowrap">簽到{checked[e.id] ?? 0}/{counts[e.id] ?? 0}</div>
											</div>
											{/* 個人狀態徽章：顯示在簽到行下方，僅登入者且有報名/講師紀錄時顯示 */}
											{isLoggedIn && myRegByEvent[e.id] && (
												<div className="mt-1">
													{(() => {
														const me = myRegByEvent[e.id]
														let text = ''
														let cls = ''
														if (me.role === 'SPEAKER') {
															text = '您是講師'
															cls = 'bg-purple-100 text-purple-700'
														} else if (me.status === 'REGISTERED') {
															text = '已報名'
															cls = 'bg-green-100 text-green-700'
														} else if (me.status === 'LEAVE') {
															text = '已請假'
															cls = 'bg-gray-100 text-gray-700'
														}
														return text ? (
															<span className={`inline-block px-2 py-0.5 rounded text-xs ${cls}`}>{text}</span>
														) : null
													})()}
												</div>
											)}
										</CardContent>
									</Link>
								) : (
									<CardContent className="p-4 rounded-xl opacity-90">
										<div className="flex justify-between items-start">
											<div className="flex-1 min-w-0">
												{/* 行1（手機）：標題；（桌面）：日期 + 標題 */}
												<div className="font-medium mb-1 sm:mb-0">
													<div className="sm:hidden line-clamp-2">{e.title}</div>
													<div className="hidden sm:flex items-center gap-2">
														<CalendarIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
														<span>{format(e.startAt, 'MM/dd（EEEEE）', { locale: zhTW })}</span>
														<span className="truncate">{e.title}</span>
													</div>
												</div>
												{/* 行2（僅手機）：日期 */}
												<div className="sm:hidden text-sm text-gray-700 flex items-center gap-2 -mt-1 mb-1">
													<CalendarIcon className="w-4 h-4 flex-shrink-0" />
													<span>{format(e.startAt, 'MM/dd（EEEEE）', { locale: zhTW })}</span>
												</div>
												<div className="text-sm text-gray-700 flex items-center gap-2">
													<MapPin className="w-4 h-4 flex-shrink-0" />
													<span className="truncate">{e.location ?? ''}</span>
												</div>
											</div>
											<div className="text-sm text-gray-500 ml-2 whitespace-nowrap">簽到{checked[e.id] ?? 0}/{counts[e.id] ?? 0}</div>
										</div>
									</CardContent>
								)}
							</Card>
						))}
					</div>
					<hr className="border-gray-200" />
				</section>
			))}
			{past.length > 0 && (
				<section className="space-y-3">
					<h2 className="text-lg font-medium">過去的活動(新到舊)</h2>
					<div className="space-y-3">
						{past.map((e) => (
							<Card key={e.id}>
								{isLoggedIn ? (
									<Link href={`/hall/${e.id}`}>
										<CardContent className="p-4 hover:bg-[color-mix(in_oklab,_var(--brand-600)_10%,_white)] rounded-xl">
											<div className="flex justify-between items-start">
												<div className="flex-1 min-w-0">
													{/* 行1（手機）：標題；（桌面）：日期 + 標題 */}
													<div className="font-medium mb-1 sm:mb-0">
														<div className="sm:hidden line-clamp-2">{e.title}</div>
														<div className="hidden sm:flex items-center gap-2">
															<CalendarIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
															<span>{format(e.startAt, 'MM/dd（EEEEE）', { locale: zhTW })}</span>
															<span className="truncate">{e.title}</span>
														</div>
													</div>
													{/* 行2（僅手機）：日期 */}
													<div className="sm:hidden text-sm text-gray-700 flex items-center gap-2 -mt-1 mb-1">
														<CalendarIcon className="w-4 h-4 flex-shrink-0" />
														<span>{format(e.startAt, 'MM/dd（EEEEE）', { locale: zhTW })}</span>
													</div>
													<div className="text-sm text-gray-700 flex items-center gap-2">
														<MapPin className="w-4 h-4 flex-shrink-0" />
														<span className="truncate">{e.location ?? ''}</span>
													</div>
												</div>
												<div className="text-sm text-gray-500 ml-2 whitespace-nowrap">簽到{checked[e.id] ?? 0}/{counts[e.id] ?? 0}</div>
											</div>
											{/* 個人狀態徽章：顯示在簽到行下方，僅登入者且有報名/講師紀錄時顯示 */}
											{isLoggedIn && myRegByEvent[e.id] && (
												<div className="mt-1">
													{(() => {
														const me = myRegByEvent[e.id]
														let text = ''
														let cls = ''
														if (me.role === 'SPEAKER') {
															text = '您是講師'
															cls = 'bg-purple-100 text-purple-700'
														} else if (me.status === 'REGISTERED') {
															text = '已報名'
															cls = 'bg-green-100 text-green-700'
														} else if (me.status === 'LEAVE') {
															text = '已請假'
															cls = 'bg-gray-100 text-gray-700'
														}
														return text ? (
															<span className={`inline-block px-2 py-0.5 rounded text-xs ${cls}`}>{text}</span>
														) : null
													})()}
												</div>
											)}
										</CardContent>
									</Link>
								) : (
									<CardContent className="p-4 rounded-xl opacity-90">
										<div className="flex justify-between items-start">
											<div className="flex-1 min-w-0">
												{/* 行1（手機）：標題；（桌面）：日期 + 標題 */}
												<div className="font-medium mb-1 sm:mb-0">
													<div className="sm:hidden line-clamp-2">{e.title}</div>
													<div className="hidden sm:flex items-center gap-2">
														<CalendarIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
														<span>{format(e.startAt, 'MM/dd（EEEEE）', { locale: zhTW })}</span>
														<span className="truncate">{e.title}</span>
													</div>
												</div>
												{/* 行2（僅手機）：日期 */}
												<div className="sm:hidden text-sm text-gray-700 flex items-center gap-2 -mt-1 mb-1">
													<CalendarIcon className="w-4 h-4 flex-shrink-0" />
													<span>{format(e.startAt, 'MM/dd（EEEEE）', { locale: zhTW })}</span>
												</div>
												<div className="text-sm text-gray-700 flex items-center gap-2">
													<MapPin className="w-4 h-4 flex-shrink-0" />
													<span className="truncate">{e.location ?? ''}</span>
												</div>
											</div>
											<div className="text-sm text-gray-500 ml-2 whitespace-nowrap">簽到{checked[e.id] ?? 0}/{counts[e.id] ?? 0}</div>
										</div>
									</CardContent>
								)}
							</Card>
						))}
					</div>
					<hr className="border-gray-200" />
				</section>
			)}
		</div>
	)
}
