import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { pushSolonByEvent } from '@/lib/line'
import { generateSolonMessage } from '@/lib/solon'
import { sendRegistrationNotification } from '@/lib/notificationHelper'

export async function POST(req: NextRequest) {
	const body = await req.json()
	const { eventId, name, phone, diet, noBeef, noPork, mealCode, companyName, industry, bniChapter, invitedBy, pptUrl } = body

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
				mealCode,
				companyName,
				industry,
				bniChapter,
				invitedBy,
				pptUrl,
			},
		})
		// 推送接龍訊息（記錄結果）
		try {
			await pushSolonByEvent(eventId, generateSolonMessage)
			console.log('[speaker/book] pushSolonByEvent ok', { eventId, createdId: created.id })
		} catch (e) {
			console.warn('[speaker/book] pushSolonByEvent failed', { eventId, err: (e as Error)?.message })
		}
		
		// 發送推送通知
		try {
			// 取名字後兩字作為顯示名稱
			const displayName = name.length >= 2 ? name.slice(-2) : name
			await sendRegistrationNotification(eventId, displayName, 'SPEAKER')
		} catch (e) {
			console.warn('[speaker/book] sendPushNotification failed', { eventId, err: (e as Error)?.message })
		}
		
		return NextResponse.json({ ok: true, id: created.id })
	} catch {
		return NextResponse.json({ error: '同一手機已預約或提交錯誤' }, { status: 400 })
	}
} 