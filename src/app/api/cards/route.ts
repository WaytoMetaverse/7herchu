import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma, CardCategory } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: '未登入' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const category = (searchParams.get('category') || '').trim().toUpperCase()
  const subs = (searchParams.get('subs') || '').split(',').map(s => s.trim()).filter(Boolean)

  const where: Prisma.BusinessCardWhereInput = { deletedAt: null }
  // 內部成員共享：回傳所有人的卡片
  if (category) where.category = category as CardCategory
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { company: { contains: q } },
      { title: { contains: q } },
      { phone: { contains: q } },
      { email: { contains: q } },
    ]
  }
  if (subs.length > 0) {
    where.subcategories = { hasSome: subs }
  }

  const list = await prisma.businessCard.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 })
  return NextResponse.json({ ok: true, data: list })
}


// 手機唯一性檢查
export async function POST(req: NextRequest) {
  const { pathname, searchParams } = new URL(req.url)
  if (pathname.endsWith('/api/cards/phone')) {
    const phone = (searchParams.get('phone') || '').trim()
    if (!phone) return NextResponse.json({ exists: false })
    const exists = await prisma.businessCard.findFirst({ where: { phone, deletedAt: null }, select: { id: true } })
    return NextResponse.json({ exists: !!exists })
  }
  return NextResponse.json({ error: '不支援' }, { status: 404 })
}

