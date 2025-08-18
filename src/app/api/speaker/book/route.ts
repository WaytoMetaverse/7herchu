import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
	const body = await req.json()
	const { eventId, name, phone, diet, noBeef, noPork, companyName, industry, bniChapter, invitedBy, pptUrl } = body

	const event = await prisma.event.findUnique({ where: { id: eventId } })
	if (!event || !event.allowSpeakers || event.speakerQuota == null) {
		return NextResponse.json({ error: '不開放講師預約' }, { status: 400 })
	}

	const count = await prisma.speakerBooking.count({ where: { eventId } })
	if (count >= event.speakerQuota) {
		return NextResponse.json({ error: '名額已滿' }, { status: 400 })
	}

	const editPasswordHash = bcrypt.hashSync(phone, 10)

	try {
		const created = await prisma.speakerBooking.create({
			data: {
				eventId,
				name,
				phone,
				editPasswordHash,
				diet,
				noBeef,
				noPork,
				companyName,
				industry,
				bniChapter,
				invitedBy,
				pptUrl,
			},
		})
		return NextResponse.json({ ok: true, id: created.id })
	} catch {
		return NextResponse.json({ error: '同一手機已預約或提交錯誤' }, { status: 400 })
	}
} 