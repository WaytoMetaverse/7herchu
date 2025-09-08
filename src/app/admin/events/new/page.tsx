import { prisma } from '@/lib/prisma'
import { EventType, PricingMode, Prisma } from '@prisma/client'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import EventTypePricing from '@/components/EventTypePricing'
import DateWithWeekday from '@/components/DateWithWeekday'
import Link from 'next/link'
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
	// timeStr 形如 "HH:MM"
	const [hh, mm] = timeStr.split(':').map((s) => Number(s))
	const d = new Date(`${dateStr}T00:00:00`)
	d.setHours(hh || 0, mm || 0, 0, 0)
	return d
}

async function createEvent(formData: FormData) {
	'use server'
	const type = String(formData.get('type')) as EventType
	const title = String(formData.get('title') ?? '')
	const dateStr = String(formData.get('date') ?? '')
	const startTime = String(formData.get('startTime') ?? '')
	const endTime = String(formData.get('endTime') ?? '')
	const location = String(formData.get('location') ?? '')
	if (!dateStr || !startTime || !endTime || !title) return
	const startAt = buildDate(dateStr, startTime)
	const endAt = buildDate(dateStr, endTime)
	// 檢查是否有輸入講師名額
	const speakerQuotaInput = Number(formData.get('speakerQuota') ?? 0)
	const hasSpeakerQuota = speakerQuotaInput > 0
	
	const data: Prisma.EventCreateInput = {
		type,
		title,
		startAt,
		endAt,
		location,
		allowSpeakers: hasSpeakerQuota, // 只要有輸入講師名額就開放
		allowGuests: type !== 'CLOSED',
		speakerQuota: hasSpeakerQuota ? speakerQuotaInput : null,
	}
	if (type === 'GENERAL') {
		data.guestPriceCents = cents(formData.get('guestPrice')) ?? 25000
	} else if (type === 'BOD') {
		data.bodMemberPriceCents = cents(formData.get('bodMemberPrice'))
		data.bodGuestPriceCents = cents(formData.get('bodGuestPrice'))
	} else if (type === 'DINNER') {
		data.pricingMode = PricingMode.MANUAL_PER_REG
		data.defaultPriceCents = cents(formData.get('defaultPrice'))
	} else if (type === 'CLOSED') {
		data.allowGuests = false
	} else if (type === 'SOFT') {
		data.defaultPriceCents = cents(formData.get('defaultPrice'))
		data.guestPriceCents = cents(formData.get('guestPrice'))
	} else if (type === 'VISIT') {
		data.defaultPriceCents = cents(formData.get('defaultPrice'))
		data.guestPriceCents = cents(formData.get('guestPrice'))
	}



	await prisma.event.create({ data })
	revalidatePath('/calendar')
	revalidatePath('/admin/events')
	redirect('/hall')
}

export default function AdminEventNewPage() {
	const options = (Object.keys(TYPE_LABEL) as EventType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))
	const timeOptions = Array.from({ length: 24 * 2 }, (_, i) => {
		const h = Math.floor(i / 2)
		const m = i % 2 === 0 ? '00' : '30'
		const hh = h < 10 ? `0${h}` : `${h}`
		return `${hh}:${m}`
	})
	return (
		<div className="max-w-3xl mx-auto p-4 space-y-5">
			<h1 className="text-2xl font-semibold leading-tight truncate">新增活動</h1>
			<form action={createEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<EventTypePricing options={options} initialType={options[0]?.value || 'GENERAL'} />
				<label className="col-span-2">日期
					<div className="flex items-center gap-2">
						<CalendarIcon className="w-4 h-4 text-gray-500" />
						<DateWithWeekday name="date" />
					</div>
				</label>
				<label>開始時間
					<div className="flex items-center gap-2">
						<Clock className="w-4 h-4 text-gray-500" />
						<select name="startTime" defaultValue="18:30" className="w-full px-4 py-3 rounded-lg border">
							{timeOptions.map((t) => (
								<option key={t} value={t}>{t}</option>
							))}
						</select>
					</div>
				</label>
				<label>結束時間
					<div className="flex items-center gap-2">
						<Clock className="w-4 h-4 text-gray-500" />
						<select name="endTime" defaultValue="21:00" className="w-full px-4 py-3 rounded-lg border">
							{timeOptions.map((t) => (
								<option key={t} value={t}>{t}</option>
							))}
						</select>
					</div>
				</label>
				<label className="col-span-2">地點
					<div className="flex items-center gap-2">
						<MapPin className="w-4 h-4" />
						<input name="location" placeholder="請輸入地點" className="w-full px-4 py-3 rounded-lg border" />
					</div>
				</label>
				<div className="col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
					<label className="col-span-1">設定講師名額
						<input name="speakerQuota" type="number" min={0} placeholder="請輸入講師名額" className="w-full px-4 py-3 rounded-lg border" />
					</label>
				</div>
				<div className="col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
					<Button type="submit" className="w-full sm:w-auto min-h-[44px]">建立</Button>
					<Button as={Link} href="/hall" variant="ghost" className="w-full sm:w-auto min-h-[44px]">取消</Button>
				</div>
			</form>
		</div>
	)
}
