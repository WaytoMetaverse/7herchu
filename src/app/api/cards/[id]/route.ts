import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CardCategory } from '@prisma/client'

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: '未登入' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const idParam = id
  const form = await req.formData().catch(() => null)
  const method = (form?.get('_method') || '').toString().toUpperCase()

  if (method === 'DELETE') {
    // 共用名片庫：已登入者皆可刪除
    const card = await prisma.businessCard.findUnique({ where: { id: idParam } })
    if (!card) return NextResponse.json({ error: '不存在' }, { status: 404 })
    await prisma.businessCard.update({ where: { id: idParam }, data: { deletedAt: new Date() } })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: '不支援的方法' }, { status: 405 })
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: '未登入' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const idParam = id
  const body = await req.json().catch(() => ({}))
  const { name, company, title, email, phone, address, website, notes, category, subcategories } = body || {}

  const card = await prisma.businessCard.findUnique({ where: { id: idParam } })
  if (!card) return NextResponse.json({ error: '不存在' }, { status: 404 })

  const updated = await prisma.businessCard.update({
    where: { id: idParam },
    data: {
      name,
      company,
      title,
      email,
      phone,
      address,
      website,
      notes,
      category: category ? (category as CardCategory) : card.category,
      subcategories: Array.isArray(subcategories) ? subcategories : card.subcategories,
    },
  })
  return NextResponse.json({ ok: true, id: updated.id })
}


