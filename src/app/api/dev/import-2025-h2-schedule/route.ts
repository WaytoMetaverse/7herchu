import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EventType, PricingMode, Prisma } from '@prisma/client'

type Row = { date: string; type: EventType; title?: string | null }

function dt(date: string, time: string) {
	// date: YYYY-MM-DD, time: HH:MM
	return new Date(`${date}T${time}:00`)
}

export async function GET() {
	// 2025 下半年預排
	const rows: Row[] = [
		{ date: '2025-08-19', type: 'JOINT' },
		{ date: '2025-08-26', type: 'BOD', title: '打造獲利的金店面' },
		{ date: '2025-09-02', type: 'SOFT' },
		{ date: '2025-09-09', type: 'GENERAL' },
		{ date: '2025-09-16', type: 'CLOSED' },
		{ date: '2025-09-23', type: 'DINNER' },
		{ date: '2025-09-30', type: 'GENERAL' },
		{ date: '2025-10-04', type: 'SOFT', title: '中秋聯歡烤肉' },
		{ date: '2025-10-07', type: 'GENERAL' },
		{ date: '2025-10-14', type: 'CLOSED' },
		{ date: '2025-10-21', type: 'DINNER' },
		{ date: '2025-10-28', type: 'BOD' },
		{ date: '2025-11-04', type: 'SOFT' },
		{ date: '2025-11-11', type: 'GENERAL' },
		{ date: '2025-11-18', type: 'CLOSED' },
		{ date: '2025-11-25', type: 'DINNER' },
		{ date: '2025-12-02', type: 'GENERAL' },
		{ date: '2025-12-09', type: 'CLOSED' },
		{ date: '2025-12-16', type: 'DINNER' },
		{ date: '2025-12-23', type: 'BOD' },
		{ date: '2025-12-30', type: 'SOFT' },
	]

	let created = 0
	for (const r of rows) {
		const startAt = dt(r.date, '18:30')
		const endAt = dt(r.date, r.type === 'SOFT' && r.title?.includes('烤肉') ? '22:00' : '21:00')
		const exists = await prisma.event.findFirst({ where: { startAt } })
		if (exists) continue

		const base: Prisma.EventCreateInput = {
			startAt,
			endAt,
			type: r.type,
			title: r.title ||
				(r.type === 'GENERAL' ? '簡報組聚' :
				 r.type === 'CLOSED' ? '封閉組聚' :
				 r.type === 'BOD' ? 'BOD 擴大商機日' :
				 r.type === 'DINNER' ? '餐敘組聚' :
				 r.type === 'SOFT' ? '軟性活動' : '聯合組聚'),
			location: '富興工廠2F',
			allowGuests: r.type !== 'CLOSED',
			allowSpeakers: r.type === 'GENERAL' ? true : false,
			pricingMode: r.type === 'DINNER' ? PricingMode.MANUAL_PER_REG : PricingMode.DEFAULT,
		}
		if (r.type === 'GENERAL') {
			base.speakerQuota = 5
			base.guestPriceCents = 25000
		}
		if (r.type === 'BOD') {
			base.bodMemberPriceCents = 30000
			base.bodGuestPriceCents = 60000
		}
		if (r.type === 'DINNER') {
			base.defaultPriceCents = 50000
		}

		await prisma.event.create({ data: base })
		created++
	}

	return NextResponse.json({ ok: true, created })
}


