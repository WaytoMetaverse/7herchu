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
	const canCheckin = canEditDelete || roles.includes('checkin_manager' as Role) || roles.includes('finance_manager' as Role)

	const [regs, speakers] = await Promise.all([
		prisma.registration.findMany({ where: { eventId: id }, orderBy: { createdAt: 'asc' }, include: { user: { select: { name: true, nickname: true } } } }),
		prisma.speakerBooking.findMany({ where: { eventId: id }, orderBy: { createdAt: 'asc' } }),
	])

	const checkedCount = regs.filter(r => r.checkedInAt != null).length
	const totalCount = regs.length

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
				<h1 className="text-2xl lg:text-3xl font-semibold">{event.title}</h1>
				<div className="flex items-center gap-2">
					{canEditDelete ? <Button as={Link} href={`/admin/events/${event.id}`} variant="outline">編輯活動</Button> : null}
					{canCheckin ? <Button as={Link} href={`/admin/checkin/${event.id}`}>簽到管理</Button> : null}
					{canEditDelete ? <ConfirmDelete eventId={event.id} action={deleteEvent} hasLocks={hasLocks} members={memberNames} guests={guestNames} speakers={speakerNames} /> : null}
				</div>
			</div>

			<div className="space-y-2 text-sm text-gray-700">
				<div className="flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-gray-500" />{format(event.startAt, 'yyyy/MM/dd（EEEEE） HH:mm', { locale: zhTW })} - {format(event.endAt, 'HH:mm', { locale: zhTW })}</div>
				<div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{event.location ?? '-'}</div>
				<div>類別：{TYPE_LABEL[event.type as EventType]}</div>
				<div className="flex items-center gap-2">報名資訊：已簽到 {checkedCount} / {totalCount}</div>
			</div>

			<div className="space-y-4">
				<Card>
					<CardContent>
						<h2 className="font-medium mb-2">講師（{speakers.length}）</h2>
						<ul className="list-disc pl-5 text-sm text-gray-800">
							{speakers.map(s => (
								<li key={s.id}>
									{[s.name, s.companyName].filter(Boolean).join(' · ')}
									{s.pptUrl ? ' · 有PPT' : ''}
								</li>
							))}
						</ul>
					</CardContent>
				</Card>

				<Card>
					<CardContent>
						<h2 className="font-medium mb-2">內部成員（{members.length}）</h2>
						<ul className="list-disc pl-5 text-sm text-gray-800">
							{members.map(m => (
								<li key={m.id}>
									{getDisplayName(m.user) || m.name || '-'}{m.checkedInAt ? '（已簽到）' : ''}
								</li>
							))}
						</ul>
					</CardContent>
				</Card>

				<Card>
					<CardContent>
						<h2 className="font-medium mb-2">來賓（{guests.length}）</h2>
						<ul className="list-disc pl-5 text-sm text-gray-800">
							{guests.map(g => (
								<li key={g.id}>
									{[g.name, g.companyName, g.invitedBy].filter(Boolean).join(' · ')}{g.checkedInAt ? '（已簽到）' : ''}
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			</div>

			<div>
				<Link href="/hall" className="text-blue-600 underline text-sm">返回活動大廳</Link>
			</div>
		</div>
	)
}


