import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url)
		const phone = searchParams.get('phone')
		const eventId = searchParams.get('eventId')

		if (!phone) {
			return NextResponse.json({ error: '請提供手機號碼' }, { status: 400 })
		}

		// 驗證手機號碼格式
		if (!/^\d{10}$/.test(phone)) {
			return NextResponse.json({ error: '請輸入正確的10碼手機號碼' }, { status: 400 })
		}

		// 查詢條件
		const where: {
			phone: string
			eventId?: string
			event?: {
				startAt: { gte: Date }
			}
		} = { 
			phone
		}

		// 如果指定了 eventId，只查詢該活動
		if (eventId) {
			where.eventId = eventId
		} else {
			where.event = {
				startAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 最近30天內的活動
			}
		}

		// 查詢報名記錄（只查詢活動報名，不含講師預約）
		const registrations = await prisma.registration.findMany({
			where,
			include: {
				event: {
					select: {
						id: true,
						title: true,
						startAt: true,
						location: true
					}
				}
			},
			orderBy: { createdAt: 'desc' }
		})

		return NextResponse.json({ 
			ok: true, 
			data: registrations 
		})

	} catch (error) {
		console.error('Registration search error:', error)
		return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
	}
}
