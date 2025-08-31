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
			return e.allowSpeakers && e.type === 'GENERAL' && left > 0
		})
	}

	const groups = new Map<string, typeof events>()
	events.forEach(e => {
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
					<Link href="/speaker/login"><Button className="bg-white border-2 border-gray-800 text-gray-900 hover:bg-gray-50 text-sm px-3 py-1 rounded-md font-medium">報名查詢</Button></Link>
				</div>
			</div>
			{Array.from(groups.entries()).map(([key, list]) => (
				<section key={key} className="space-y-3">
					<h2 className="text-lg font-medium">{format(new Date(key + '-01'), 'yyyy/MM', { locale: zhTW })}</h2>
					<div className="space-y-3">
						{list.map((e) => {
							const canBookSpeaker = e.allowSpeakers && e.type === EventType.GENERAL
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
											<div className="text-sm">{label}</div>
										</div>
										</CardContent>
									</Link>
									<div className="px-4 pb-4 mt-2 flex items-center gap-2">
										{canBook ? (
											<Link href={`/speaker/book?event=${e.id}`}>
												<Button className="bg-[var(--brand-600)] hover:bg-[var(--brand-700)] text-white text-sm px-3 py-1 rounded-md">預約短講</Button>
											</Link>
										) : (
											<Button as="button" className="bg-white border-2 border-gray-800 text-gray-900 text-sm px-3 py-1 rounded-md font-medium" aria-disabled>
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
		</div>
	)
} 