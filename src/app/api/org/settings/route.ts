import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
	const s = await prisma.orgSettings.findUnique({ where: { id: 'singleton' } })
	return NextResponse.json({ bank: s?.bankInfo ?? '' })
} 