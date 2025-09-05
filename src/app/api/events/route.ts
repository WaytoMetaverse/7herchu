import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EventType, PricingMode } from '@prisma/client'

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url)
	const id = searchParams.get('id')
	
	if (id) {
		// 查詢單一活動
		const event = await prisma.event.findUnique({ where: { id } })
		if (!event) {
			return NextResponse.json({ error: '活動不存在' }, { status: 404 })
		}
		return NextResponse.json({ data: event })
	} else {
		// 查詢所有活動
		const list = await prisma.event.findMany({ orderBy: { startAt: 'asc' } })
		return NextResponse.json(list)
	}
}

export async function POST(req: NextRequest) {
	const data = await req.json()

	// 檢查是否有輸入講師名額
	const hasSpeakerQuota = data.speakerQuota && data.speakerQuota > 0
	data.allowSpeakers = hasSpeakerQuota

	if (data.type === EventType.BOD) {
		if (!data.bodMemberPriceCents || !data.bodGuestPriceCents) return NextResponse.json({ error: 'BOD 需填成員價與來賓價' }, { status: 400 })
		data.allowGuests = true
	} else if (data.type === EventType.DINNER) {
		data.pricingMode = PricingMode.MANUAL_PER_REG
		if (!data.defaultPriceCents) return NextResponse.json({ error: '餐敘需填活動價格' }, { status: 400 })
		data.allowGuests = true
	} else if (data.type === EventType.CLOSED) {
		data.allowGuests = false
	} else if (data.type === EventType.JOINT) {
		data.allowGuests = true
	} else if (data.type === EventType.GENERAL) {
		data.allowGuests = true
		data.speakerQuota ??= 5
		data.guestPriceCents ??= 25000
	}

	const created = await prisma.event.create({ data })
	return NextResponse.json(created)
} 