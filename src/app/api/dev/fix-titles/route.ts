import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
	const result = await prisma.event.updateMany({
		where: { title: '一般組聚' },
		data: { title: '簡報組聚' },
	})
	return NextResponse.json({ ok: true, updated: result.count })
}


