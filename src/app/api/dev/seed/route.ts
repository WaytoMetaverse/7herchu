import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EventType, PricingMode, Prisma } from '@prisma/client'

function getNextTuesdays(count: number) {
	const result: Date[] = []
	const d = new Date()
	// move to next Tuesday
	while (d.getDay() !== 2) d.setDate(d.getDate() + 1)
	for (let i = 0; i < count; i++) {
		result.push(new Date(d))
		d.setDate(d.getDate() + 7)
	}
	return result
}

export async function GET() {
	// create 8 upcoming Tuesdays with rotating types
	const dates = getNextTuesdays(8)
	const types: EventType[] = [
		EventType.GENERAL,
		EventType.CLOSED,
		EventType.BOD,
		EventType.DINNER,
		EventType.JOINT,
		EventType.GENERAL,
		EventType.GENERAL,
		EventType.JOINT,
	]

	let created = 0
	for (let i = 0; i < dates.length; i++) {
		const startAt = new Date(dates[i])
		startAt.setHours(18, 30, 0, 0)
		const endAt = new Date(dates[i])
		endAt.setHours(21, 0, 0, 0)
		const type = types[i % types.length]
		const title =
			type === EventType.GENERAL
				? '簡報組聚'
			: type === EventType.CLOSED
				? '封閉組聚'
				: type === EventType.BOD
				? 'BOD 擴大商機日'
				: type === EventType.DINNER
				? '餐敘組聚'
				: '聯合組聚'

		const exists = await prisma.event.findFirst({ where: { startAt } })
		if (exists) continue

		const base: Prisma.EventCreateInput = {
			startAt,
			endAt,
			type,
			title,
			location: '富興工廠2F',
			allowGuests: type !== EventType.CLOSED,
			allowSpeakers: type === EventType.GENERAL,
			pricingMode: type === EventType.DINNER ? PricingMode.MANUAL_PER_REG : PricingMode.DEFAULT,
		}

		if (type === EventType.GENERAL) {
			base.speakerQuota = 5
			base.guestPriceCents = 25000
		}
		if (type === EventType.BOD) {
			base.bodMemberPriceCents = 30000 // 成員 300 元
			base.bodGuestPriceCents = 60000 // 來賓 600 元
		}
		if (type === EventType.DINNER) {
			base.defaultPriceCents = 50000 // 示意：餐敘單一價 500 元
		}

		await prisma.event.create({ data: base })
		created++
	}

	return NextResponse.json({ ok: true, created })
}
