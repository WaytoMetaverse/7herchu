import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET /api/speaker/booking?phone=...&eventId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const phone = searchParams.get('phone')?.trim()
  const eventId = searchParams.get('eventId')?.trim() || undefined
  if (!phone) return NextResponse.json({ error: '缺少手機' }, { status: 400 })

  if (eventId) {
    const one = await prisma.speakerBooking.findFirst({ where: { phone, eventId } })
    return NextResponse.json({ ok: true, data: one || null })
  }

  const now = new Date()
  const list = await prisma.speakerBooking.findMany({
    where: { phone, event: { startAt: { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1) } } },
    include: { event: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  return NextResponse.json({ ok: true, data: list })
}

// PUT body: { id, phone, ...updatableFields }
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, phone, name, diet, noBeef, noPork, companyName, industry, guestType, bniChapter, invitedBy, pptUrl, mealCode } = body || {}
  if (!id || !phone) return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })

  const existing = await prisma.speakerBooking.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '資料不存在' }, { status: 404 })

  const ok = await bcrypt.compare(String(phone), existing.editPasswordHash)
  if (!ok) return NextResponse.json({ error: '未授權' }, { status: 403 })

  const updated = await prisma.speakerBooking.update({
    where: { id },
    data: { name, diet, noBeef, noPork, companyName, industry, guestType, bniChapter, invitedBy, pptUrl, mealCode },
  })
  return NextResponse.json({ ok: true, id: updated.id })
}

// DELETE /api/speaker/booking  刪除所有講師預約（管理用途）
export async function DELETE() {
  try {
    await prisma.speakerBooking.deleteMany({})
    return NextResponse.json({ ok: true, deleted: 'all' })
  } catch {
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 })
  }
}


