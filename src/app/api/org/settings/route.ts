import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
	const s = await prisma.orgSettings.findUnique({ where: { id: 'singleton' } })
	return NextResponse.json({ bank: s?.bankInfo ?? '中國信託822 城中分行 107540665031' })
} 