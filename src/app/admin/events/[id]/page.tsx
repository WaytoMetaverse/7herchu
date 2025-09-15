import { prisma } from '@/lib/prisma'
import { EventType, PricingMode, Prisma } from '@prisma/client'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import EventTypePricing from '@/components/EventTypePricing'
import DateWithWeekday from '@/components/DateWithWeekday'
import Button from '@/components/ui/Button'
import { Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react'

function cents(v: FormDataEntryValue | null) {
	const n = Number(String(v ?? '').trim())
	return Number.isFinite(n) ? Math.round(n * 100) : null
}

const TYPE_LABEL: Record<EventType, string> = {
	GENERAL: '簡報組聚',
	CLOSED: '封閉組聚',
	BOD: 'BOD 擴大商機日',
	DINNER: '餐敘組聚',
	JOINT: '聯合組聚',
	SOFT: '軟性活動',
	VISIT: '職業參訪',
}

function buildDate(dateStr: string, timeStr: string) {
	const [hh, mm] = timeStr.split(':').map((s) => Number(s))
	const d = new Date(`${dateStr}T00:00:00`)
	d.setHours(hh || 0, mm || 0, 0, 0)
	return d
}

async function updateEvent(formData: FormData) {
	'use server'
	const id = String(formData.get('id'))
	const type = String(formData.get('type')) as EventType
	const title = String(formData.get('title') ?? '')
	const dateStr = String(formData.get('date') ?? '')
	const startTime = String(formData.get('startTime') ?? '')
	const endTime = String(formData.get('endTime') ?? '')
	const location = String(formData.get('location') ?? '')
	const content = String(formData.get('content') ?? '').trim()
	if (!id || !dateStr || !startTime || !endTime || !title) return
	const startAt = buildDate(dateStr, startTime)
	const endAt = buildDate(dateStr, endTime)
	const data: Prisma.EventUpdateInput = { type, title, startAt, endAt, location, content: content || null }
	if (type === 'GENERAL') {
		data.allowSpeakers = true
		data.allowGuests = true
		data.speakerQuota = Number(formData.get('speakerQuota') ?? 5)
		data.guestPriceCents = cents(formData.get('guestPrice')) ?? 25000
		data.bodMemberPriceCents = null
		data.bodGuestPriceCents = null
		data.defaultPriceCents = null
		data.pricingMode = PricingMode.DEFAULT
	} else if (type === 'BOD') {
		data.allowSpeakers = false
		data.allowGuests = true
		data.bodMemberPriceCents = cents(formData.get('bodMemberPrice'))
		data.bodGuestPriceCents = cents(formData.get('bodGuestPrice'))
		data.speakerQuota = null
		data.guestPriceCents = null
		data.defaultPriceCents = null
		data.pricingMode = PricingMode.DEFAULT
	} else if (type === 'DINNER') {
		data.allowSpeakers = false
		data.allowGuests = true
		data.pricingMode = PricingMode.MANUAL_PER_REG
		data.defaultPriceCents = cents(formData.get('defaultPrice'))
		data.speakerQuota = null
		data.guestPriceCents = null
		data.bodMemberPriceCents = null
		data.bodGuestPriceCents = null
	} else if (type === 'CLOSED') {
		data.allowSpeakers = false
		data.allowGuests = false
		data.speakerQuota = null
		data.guestPriceCents = null
		data.bodMemberPriceCents = null
		data.bodGuestPriceCents = null
		data.defaultPriceCents = null
		data.pricingMode = PricingMode.DEFAULT
	} else if (type === 'JOINT') {
		data.allowSpeakers = false
		data.allowGuests = true
		data.speakerQuota = null
		data.guestPriceCents = null
		data.bodMemberPriceCents = null
		data.bodGuestPriceCents = null
		data.defaultPriceCents = null
		data.pricingMode = PricingMode.DEFAULT
	} else if (type === 'SOFT') {
		data.allowSpeakers = false
		data.allowGuests = true
		data.defaultPriceCents = cents(formData.get('defaultPrice'))
		data.guestPriceCents = cents(formData.get('guestPrice'))
		data.speakerQuota = null
		data.bodMemberPriceCents = null
		data.bodGuestPriceCents = null
		data.pricingMode = PricingMode.DEFAULT
	} else if (type === 'VISIT') {
		data.allowSpeakers = false
		data.allowGuests = true
		data.defaultPriceCents = cents(formData.get('defaultPrice'))
		data.guestPriceCents = cents(formData.get('guestPrice'))
		data.speakerQuota = null
		data.bodMemberPriceCents = null
		data.bodGuestPriceCents = null
		data.pricingMode = PricingMode.DEFAULT
	}
	await prisma.event.update({ where: { id }, data })
	revalidatePath('/calendar')
	revalidatePath('/admin/events')
	redirect('/hall')
}

export default async function AdminEventEditPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const e = await prisma.event.findUnique({ where: { id } })
	if (!e) notFound()
	const dateStr = new Date(e.startAt).toISOString().slice(0,10)
	const toTime = (d: Date) => `${d.getHours().toString().padStart(2,'0')}:${(d.getMinutes()===30 ? '30' : '00')}`
	const startTime = toTime(new Date(e.startAt))
	const endTime = toTime(new Date(e.endAt))
	const options = (Object.keys(TYPE_LABEL) as EventType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))
	const timeOptions = Array.from({ length: 24 * 2 }, (_, i) => {
		const h = Math.floor(i / 2)
		const m = i % 2 === 0 ? '00' : '30'
		const hh = h < 10 ? `0${h}` : `${h}`
		return `${hh}:${m}`
	})
	return (
		<div className="max-w-3xl mx-auto p-4 space-y-5">
			<h1 className="text-2xl font-semibold">編輯活動</h1>
			<form action={updateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<input type="hidden" name="id" defaultValue={e.id} />
				<div className="col-span-1 md:col-span-2">
					<EventTypePricing
						options={options}
						initialType={e.type}
						initialTitle={e.title}
						initialGuestPrice={e.guestPriceCents ? e.guestPriceCents / 100 : null}
						initialBodMemberPrice={e.bodMemberPriceCents ? e.bodMemberPriceCents / 100 : null}
						initialBodGuestPrice={e.bodGuestPriceCents ? e.bodGuestPriceCents / 100 : null}
						initialDefaultPrice={e.defaultPriceCents ? e.defaultPriceCents / 100 : null}
					/>
				</div>
				<label className="col-span-2">日期
					<div className="flex items-center gap-2">
						<CalendarIcon className="w-4 h-4 text-gray-500" />
						<DateWithWeekday name="date" defaultValue={dateStr} />
					</div>
				</label>
				<label className="col-span-1">開始時間
					<div className="flex items-center gap-2">
						<Clock className="w-4 h-4 text-gray-500" />
						<select name="startTime" defaultValue={startTime} >
							{timeOptions.map((t) => (
								<option key={t} value={t}>{t}</option>
							))}
						</select>
					</div>
				</label>
				<label className="col-span-1">結束時間
					<div className="flex items-center gap-2">
						<Clock className="w-4 h-4 text-gray-500" />
						<select name="endTime" defaultValue={endTime} >
							{timeOptions.map((t) => (
								<option key={t} value={t}>{t}</option>
							))}
						</select>
					</div>
				</label>
				<label className="col-span-2">地點
					<div className="flex items-center gap-2">
						<MapPin className="w-4 h-4" />
						<input name="location" defaultValue={e.location ?? ''}  />
					</div>
				</label>
				<div className="col-span-2">
					<label className="block">活動內容
						<textarea name="content" defaultValue={e.content ?? ''} rows={5} className="w-full" />
					</label>
				</div>
				<div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
					<label>一般：講師名額
						<input name="speakerQuota" type="number" defaultValue={e.speakerQuota ?? 5}  />
					</label>
				</div>
				<div className="col-span-2 flex items-center gap-3">
					<Button type="submit">儲存</Button>
					<Button as={Link} href="/hall" variant="ghost">取消</Button>
				</div>
			</form>
		</div>
	)
}
