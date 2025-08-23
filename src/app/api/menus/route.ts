import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url)
		const eventId = searchParams.get('eventId')

		if (!eventId) {
			return NextResponse.json({ error: '請提供活動ID參數' }, { status: 400 })
		}

		const eventMenu = await prisma.eventMenu.findUnique({
			where: { eventId }
		})

		return NextResponse.json({
			ok: true,
			data: eventMenu
		})

	} catch (error) {
		console.error('Event menu fetch error:', error)
		return NextResponse.json({ error: '載入活動餐點失敗' }, { status: 500 })
	}
}
