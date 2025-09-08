import { prisma } from '@/lib/prisma'
import { EventType, Role } from '@prisma/client'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Calendar as CalendarIcon, MapPin } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import OpenOnlyToggle from '@/components/calendar/OpenOnlyToggle'

function statusLabel(allowSpeakers: boolean, quota?: number | null, count?: number) {
	if (!allowSpeakers) return '已額滿'
	if (!quota || quota <= 0) return '已額滿'
	const left = Math.max(0, (quota ?? 0) - (count ?? 0))
	return left > 0 ? `可預約（剩 ${left} 位）` : '已額滿'
}

const TYPE_LABEL: Record<EventType, string> = {
	GENERAL: '簡報組聚',
	CLOSED: '封閉組聚',
	BOD: 'BOD 擴大商機日',
	DINNER: '餐敘組聚',
	JOINT: '聯合組聚',
	SOFT: '軟性活動',
}

function ym(d: Date) { return format(d, 'yyyy-MM') }

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
	// 顯示全部活動
	const all = await prisma.event.findMany({ orderBy: { startAt: 'asc' } })
	const sp = await searchParams
	const openOnly = sp.open === '1'

	const counts = Object.fromEntries(
		(
			await prisma.speakerBooking.groupBy({
				by: ['eventId'],
				_count: { _all: true },
				where: { eventId: { in: all.map((e) => e.id) } },
			})
		).map((g) => [g.eventId, g._count._all])
	)

	let events = all
	if (openOnly) {
		events = all.filter(e => {
			const count = counts[e.id] ?? 0
			const left = Math.max(0, (e.speakerQuota ?? 0) - count)
			return e.allowSpeakers && left > 0
		})
	}

	// 分群：即將與今日（asc）/ 過去（desc）
	const now = new Date()
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const upcoming = events.filter(e => e.startAt >= todayStart)
	const past = events.filter(e => e.startAt < todayStart).sort((a, b) => b.startAt.getTime() - a.startAt.getTime())

	const groups = new Map<string, typeof events>()
	upcoming.forEach(e => {
		const key = ym(e.startAt)
		if (!groups.has(key)) groups.set(key, [])
		groups.get(key)!.push(e)
	})

	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles) ?? []


	return (
		<div className="max-w-3xl mx-auto p-4 space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">講師預約</h1>
				<div className="flex items-center gap-3">
					<OpenOnlyToggle />
					<Button as={Link} href="/admin/invitations" variant="outline" size="sm" className="whitespace-nowrap">講師邀請</Button>
					<Link href="/speaker/login"><Button variant="outline" size="sm">報名查詢</Button></Link>
				</div>
			</div>
			{Array.from(groups.entries()).map(([key, list]) => (
				<section key={key} className="space-y-3">
					<h2 className="text-lg font-medium">{format(new Date(key + '-01'), 'yyyy/MM', { locale: zhTW })}</h2>
					<div className="space-y-3">
						{list.map((e) => {
							const canBookSpeaker = e.allowSpeakers
							const cnt = counts[e.id] ?? 0
							const quota = e.speakerQuota ?? 0
							const hasQuota = quota > 0
							const availableSlots = quota - cnt
							const canBook = canBookSpeaker && hasQuota && availableSlots > 0
							const label = statusLabel(canBookSpeaker, quota, cnt)
							return (
								<Card key={e.id}>
									<Link href={`/calendar/${e.id}`}>
										<CardContent className="p-4 rounded-xl">
											<div className="flex justify-between items-start">
												<div className="flex-1 min-w-0">
													<div className="font-medium flex items-center gap-2">
														<CalendarIcon className="w-4 h-4 text-gray-500" />
														<span>{format(e.startAt, 'MM/dd（EEEEE）', { locale: zhTW })}</span>
														<span className="truncate">{e.title}</span>
													</div>
													<div className="text-sm text-gray-700 flex items-center gap-2">
														<MapPin className="w-4 h-4" />
														<span className="truncate">{e.location ?? ''}</span>
														<span className="text-[var(--brand-700)] whitespace-nowrap">· {TYPE_LABEL[e.type as EventType]}</span>
													</div>
												</div>
												<div className="text-sm">{label}</div>
											</div>
										</CardContent>
									</Link>
									<div className="px-4 pb-4 mt-2 flex items-center gap-2">
										{canBook ? (
											<Link href={`/speaker/book?event=${e.id}&from=calendar`}>
												<Button variant="primary" size="sm">預約短講</Button>
											</Link>
										) : (
											<Button as="button" variant="outline" size="sm" aria-disabled>
												不可預約
											</Button>
										)}
									</div>
								</Card>
							)
						})}
					</div>
					<hr className="border-gray-200" />
				</section>
			))}
			{past.length > 0 && (
				<section className="space-y-3">
					<h2 className="text-lg font-medium">過去的活動(新到舊)</h2>
					<div className="space-y-3">
						{past.map((e) => {
							const canBookSpeaker = e.allowSpeakers
							const cnt = counts[e.id] ?? 0
							const quota = e.speakerQuota ?? 0
							const hasQuota = quota > 0
							const availableSlots = quota - cnt
							const canBook = canBookSpeaker && hasQuota && availableSlots > 0
							const label = statusLabel(canBookSpeaker, quota, cnt)
							return (
								<Card key={e.id}>
									<Link href={`/calendar/${e.id}`}>
										<CardContent className="p-4">
											<div className="flex justify-between">
												<div>
													<div className="font-medium flex items-center gap-2">
														<CalendarIcon className="w-4 h-4 text-gray-500" />
														<span>{format(e.startAt, 'MM/dd（EEEEE）', { locale: zhTW })}</span>
														<span>{e.title}</span>
													</div>
													<div className="text-sm text-gray-600 flex items-center gap-2">
														<MapPin className="w-4 h-4" />
														<span>{e.location ?? ''}</span>
														<span>· {TYPE_LABEL[e.type as EventType]}</span>
													</div>
												</div>
											</div>
											<div className="text-sm text-gray-500 ml-2 whitespace-nowrap">{label}</div>
										</CardContent>
									</Link>
									<div className="px-4 pb-4 mt-2 flex items-center gap-2">
										{canBook ? (
											<Link href={`/speaker/book?event=${e.id}&from=calendar`}>
												<Button variant="primary" size="sm">預約短講</Button>
											</Link>
										) : (
											<Button as="button" variant="outline" size="sm" aria-disabled>
												不可預約
											</Button>
										)}
									</div>
								</Card>
							)
						})}
					</div>
					<hr className="border-gray-200" />
				</section>
			)}
		</div>
	)
} 