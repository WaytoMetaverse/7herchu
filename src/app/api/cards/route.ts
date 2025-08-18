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

  const where: Prisma.BusinessCardWhereInput = { }
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


