import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CardCategory } from '@prisma/client'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: '未登入' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const body = await req.json()
  const { name, company, title, email, phone, address, website, notes, imageData, category, subcategories } = body || {}
  if (!name) return NextResponse.json({ error: '缺少姓名' }, { status: 400 })
  const card = await prisma.businessCard.create({
    data: {
      ownerId: user.id,
      name,
      company,
      title,
      email,
      phone,
      address,
      website,
      notes,
      imageUrl: imageData || null,
      category: (category as CardCategory) || 'MANAGEMENT',
      subcategories: Array.isArray(subcategories) ? subcategories : [],
    },
  })
  return NextResponse.json({ ok: true, id: card.id })
}


