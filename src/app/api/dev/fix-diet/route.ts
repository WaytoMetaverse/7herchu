import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 臨時修復工具：重置活動報名者的 diet 欄位
 * GET /api/dev/fix-diet?eventId=xxx - 查看當前狀態
 * POST /api/dev/fix-diet - 執行修復
 */

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url)
	const eventId = searchParams.get('eventId')

	if (!eventId) {
		return NextResponse.json({ error: '請提供 eventId' }, { status: 400 })
	}

	// 取得活動資訊
	const event = await prisma.event.findUnique({
		where: { id: eventId },
		select: { title: true, startAt: true }
	})

	if (!event) {
		return NextResponse.json({ error: '活動不存在' }, { status: 404 })
	}

	// 取得所有報名者
	const registrations = await prisma.registration.findMany({
		where: { eventId, status: 'REGISTERED' },
		select: {
			id: true,
			name: true,
			phone: true,
			diet: true,
			noBeef: true,
			noPork: true,
			mealCode: true,
			role: true,
			user: {
				select: {
					name: true,
					nickname: true
				}
			}
		},
		orderBy: { createdAt: 'asc' }
	})

	// 取得講師
	const speakers = await prisma.speakerBooking.findMany({
		where: { eventId },
		select: {
			id: true,
			name: true,
			phone: true,
			diet: true,
			noBeef: true,
			noPork: true,
			mealCode: true
		},
		orderBy: { createdAt: 'asc' }
	})

	return NextResponse.json({
		event: {
			title: event.title,
			date: event.startAt
		},
		registrations: registrations.map(r => ({
			id: r.id,
			name: r.user?.nickname || r.user?.name || r.name,
			phone: r.phone,
			role: r.role,
			diet: r.diet,
			noBeef: r.noBeef,
			noPork: r.noPork,
			mealCode: r.mealCode,
			// 建議的 diet 值（根據 noBeef 和 noPork 推斷）
			suggestedDiet: (r.noBeef && r.noPork) ? 'veg' : 'meat'
		})),
		speakers: speakers.map(s => ({
			id: s.id,
			name: s.name,
			phone: s.phone,
			diet: s.diet,
			noBeef: s.noBeef,
			noPork: s.noPork,
			mealCode: s.mealCode,
			suggestedDiet: (s.noBeef && s.noPork) ? 'veg' : 'meat'
		})),
		total: registrations.length + speakers.length
	})
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		const { eventId, fixes } = body

		if (!eventId) {
			return NextResponse.json({ error: '請提供 eventId' }, { status: 400 })
		}

		if (!Array.isArray(fixes) || fixes.length === 0) {
			return NextResponse.json({ error: '請提供 fixes 陣列' }, { status: 400 })
		}

		// 執行批量更新
		const results = {
			registrations: 0,
			speakers: 0,
			errors: [] as string[]
		}

		for (const fix of fixes) {
			try {
				if (fix.type === 'registration') {
					await prisma.registration.update({
						where: { id: fix.id },
						data: { diet: fix.diet }
					})
					results.registrations++
				} else if (fix.type === 'speaker') {
					await prisma.speakerBooking.update({
						where: { id: fix.id },
						data: { diet: fix.diet }
					})
					results.speakers++
				}
			} catch (e) {
				results.errors.push(`Failed to update ${fix.type} ${fix.id}: ${(e as Error).message}`)
			}
		}

		return NextResponse.json({
			ok: true,
			message: `已更新 ${results.registrations} 位成員和 ${results.speakers} 位講師的 diet 欄位`,
			results
		})

	} catch (error) {
		console.error('Fix diet error:', error)
		return NextResponse.json({ error: '修復失敗' }, { status: 500 })
	}
}

