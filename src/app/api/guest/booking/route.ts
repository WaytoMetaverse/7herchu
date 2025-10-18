import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET /api/guest/booking?phone=...&eventId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const phone = searchParams.get('phone')?.trim()
  const eventId = searchParams.get('eventId')?.trim() || undefined
  
  if (!phone) return NextResponse.json({ error: '缺少手機號碼' }, { status: 400 })

  if (eventId) {
    // 查詢特定活動的來賓報名
    const registration = await prisma.registration.findFirst({ 
      where: { 
        phone, 
        eventId,
        role: 'GUEST' // 只查詢來賓報名
      },
      include: {
        event: true
      }
    })
    return NextResponse.json({ ok: true, data: registration || null })
  }

  // 查詢該手機號碼的所有來賓報名（最近2個月）
  const now = new Date()
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  
  const registrations = await prisma.registration.findMany({
    where: { 
      phone, 
      role: 'GUEST',
      event: { 
        startAt: { gte: twoMonthsAgo } 
      } 
    },
    include: { 
      event: true 
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  
  return NextResponse.json({ ok: true, data: registrations })
}

// PUT /api/guest/booking - 更新來賓報名資料
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { 
    id, 
    phone, 
    name, 
    companyName, 
    industry,
    guestType,
    bniChapter, 
    invitedBy, 
    diet, 
    noBeef, 
    noPork, 
    mealCode 
  } = body || {}
  
  if (!id || !phone) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // 查詢現有報名記錄
  const existing = await prisma.registration.findUnique({ 
    where: { id },
    include: { event: true }
  })
  
  if (!existing) {
    return NextResponse.json({ error: '報名記錄不存在' }, { status: 404 })
  }

  if (existing.role !== 'GUEST') {
    return NextResponse.json({ error: '此記錄不是來賓報名' }, { status: 400 })
  }

  // 驗證編輯密碼（手機號碼）
  if (!existing.editPasswordHash) {
    return NextResponse.json({ error: '此報名記錄不支援編輯' }, { status: 403 })
  }

  const passwordValid = await bcrypt.compare(String(phone), existing.editPasswordHash)
  if (!passwordValid) {
    return NextResponse.json({ error: '手機號碼驗證失敗' }, { status: 403 })
  }

  // 更新報名資料
  const updated = await prisma.registration.update({
    where: { id },
    data: { 
      name, 
      companyName, 
      industry,
      guestType: guestType as 'PANSHI' | 'OTHER_BNI' | 'NON_BNI' | null,
      bniChapter, 
      invitedBy, 
      diet, 
      noBeef, 
      noPork, 
      mealCode 
    },
  })
  
  return NextResponse.json({ ok: true, id: updated.id })
}
