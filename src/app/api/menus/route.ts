import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url)
		const month = searchParams.get('month')

		if (!month) {
			return NextResponse.json({ error: '請提供月份參數' }, { status: 400 })
		}

		const menu = await prisma.menu.findUnique({
			where: { month, published: true },
			include: { items: true }
		})

		return NextResponse.json({ 
			ok: true, 
			data: menu 
		})

	} catch (error) {
		console.error('Menu fetch error:', error)
		return NextResponse.json({ error: '載入菜單失敗' }, { status: 500 })
	}
}
