import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CardCategory, Prisma } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: '未登入' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 })

    let body: unknown = null
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: '無效的請求內容' }, { status: 400 })
    }

    const raw = (body as Record<string, unknown>) || {}
    const trimOrNull = (v: unknown) => (typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : null)
    const name = typeof raw.name === 'string' ? raw.name.trim() : ''
    const company = trimOrNull(raw.company)
    const title = trimOrNull(raw.title)
    const email = trimOrNull(raw.email)
    const phone = trimOrNull(raw.phone)
    const address = trimOrNull(raw.address)
    const website = trimOrNull(raw.website)
    const notes = typeof raw.notes === 'string' ? (raw.notes.trim() || null) : null
    const imageData = trimOrNull(raw.imageData)
    const category = typeof raw.category === 'string' ? raw.category : ''
    const subcategoriesInput = Array.isArray(raw.subcategories) ? raw.subcategories : []

    if (!name) return NextResponse.json({ error: '缺少姓名' }, { status: 400 })
    if (phone) {
      const dup = await prisma.businessCard.findFirst({ where: { phone, deletedAt: null }, select: { id: true } })
      if (dup) return NextResponse.json({ error: '手機已存在' }, { status: 400 })
    }

    const safeSubs: string[] = subcategoriesInput.filter((s): s is string => typeof s === 'string')

    const catInput = category
    const cat: CardCategory = (Object.values(CardCategory) as string[]).includes(catInput)
      ? (catInput as CardCategory)
      : 'MANAGEMENT'

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
        category: cat,
        subcategories: safeSubs,
      },
    })
    return NextResponse.json({ ok: true, id: card.id })
  } catch (err) {
    // Prisma 唯一鍵錯誤（例如 phone）
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: '手機已存在' }, { status: 400 })
    }
    console.error('cards/save error', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}


