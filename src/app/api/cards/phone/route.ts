import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const phone = (searchParams.get('phone') || '').trim()
  if (!phone) return NextResponse.json({ exists: false })
  const exists = await prisma.businessCard.findFirst({ where: { phone, deletedAt: null }, select: { id: true } })
  return NextResponse.json({ exists: !!exists })
}


