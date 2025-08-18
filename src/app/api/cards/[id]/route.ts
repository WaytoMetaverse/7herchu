import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { CardCategory } from '@prisma/client'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: '未登入' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const id = params.id
  const form = await req.formData().catch(() => null)
  const method = (form?.get('_method') || '').toString().toUpperCase()

  if (method === 'DELETE') {
    // 共用名片庫：已登入者皆可刪除
    const card = await prisma.businessCard.findUnique({ where: { id } })
    if (!card) return NextResponse.json({ error: '不存在' }, { status: 404 })
    await prisma.businessCard.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: '不支援的方法' }, { status: 405 })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: '未登入' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const id = params.id
  const body = await req.json().catch(() => ({}))
  const { name, company, title, email, phone, address, website, notes, category, subcategories } = body || {}

  const card = await prisma.businessCard.findUnique({ where: { id } })
  if (!card) return NextResponse.json({ error: '不存在' }, { status: 404 })

  const updated = await prisma.businessCard.update({
    where: { id },
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


