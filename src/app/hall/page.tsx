import { prisma } from '@/lib/prisma'
import { EventType } from '@prisma/client'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { format } from 'date-fns'
import zhTW from 'date-fns/locale/zh-TW'
import { Calendar as CalendarIcon, MapPin } from 'lucide-react'

const TYPE_LABEL: Record<EventType, string> = {
	GENERAL: '簡報組聚',
	CLOSED: '封閉組聚',
	BOD: 'BOD 擴大商機日',
	DINNER: '餐敘組聚',
	JOINT: '聯合組聚',
	SOFT: '軟性活動',
}

function ym(d: Date) { return format(d, 'yyyy-MM') }

export default async function HallPage() {
	const events = await prisma.event.findMany({ orderBy: { startAt: 'asc' } })

	const counts = Object.fromEntries(
		(
			await prisma.registration.groupBy({
				by: ['eventId'],
				_count: { _all: true },
				where: { eventId: { in: events.map(e => e.id) } },
			})
		).map(g => [g.eventId, g._count._all])
	)

	const checked = Object.fromEntries(
		(
			await prisma.registration.groupBy({
				by: ['eventId'],
				_count: { _all: true },
				where: { eventId: { in: events.map(e => e.id) }, checkedInAt: { not: null } },
			})
		).map(g => [g.eventId, g._count._all])
	)

	// 依月份分組
	const groups = new Map<string, typeof events>()
	events.forEach(e => {
		const key = ym(e.startAt)
		if (!groups.has(key)) groups.set(key, [])
		groups.get(key)!.push(e)
	})

	return (
		<div className="max-w-3xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold tracking-tight">活動大廳</h1>
				<Button as={Link} href="/admin/events/new">新增活動</Button>
			</div>
			{Array.from(groups.entries()).map(([key, list]) => (
				<section key={key} className="space-y-3">
					<h2 className="text-lg font-medium">{format(new Date(key + '-01'), 'yyyy/MM', { locale: zhTW })}</h2>
					<div className="space-y-3">
						{list.map((e) => (
							<Card key={e.id}>
								<Link href={`/hall/${e.id}`}>
									<CardContent className="p-4 hover:bg-gray-50 rounded-xl">
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
											<div className="text-sm text-gray-500">簽到 {checked[e.id] ?? 0} / {counts[e.id] ?? 0}</div>
										</div>
									</CardContent>
								</Link>
							</Card>
						))}
					</div>
					<hr className="border-gray-200" />
				</section>
			))}
		</div>
	)
}
