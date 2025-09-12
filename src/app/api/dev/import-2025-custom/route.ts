import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EventType, PricingMode, Prisma } from '@prisma/client'

type Row = {
  date: string // YYYY-MM-DD
  type: EventType
  title: string
  location?: string | null
}

function build(date: string, hh: number, mm: number) {
  const d = new Date(`${date}T00:00:00`)
  d.setHours(hh, mm, 0, 0)
  return d
}

export async function GET() {
  // 依使用者提供之 2025 年下半年排程
  const rows: Row[] = [
    { date: '2025-08-19', type: 'JOINT',   title: '聯合組聚 磐鈺分會', location: '富興工廠2F' },
    { date: '2025-08-26', type: 'BOD',     title: 'BOD 打造獲利的金店面', location: '富興工廠2F' },
    { date: '2025-09-02', type: 'SOFT',    title: '軟性活動 KTV', location: '中清路超級巨星' },
    { date: '2025-09-09', type: 'JOINT',   title: '聯合組聚 台北大源分會', location: '富興工廠2F' },
    { date: '2025-09-16', type: 'CLOSED',  title: '封閉組聚 案場報價交流', location: '富興工廠2F' },
    { date: '2025-09-23', type: 'DINNER',  title: '餐敘組聚 Emma美食部落客', location: null },
    { date: '2025-09-30', type: 'GENERAL', title: '簡報組聚 元創/元鑽分會', location: '富興工廠2F' },
    { date: '2025-10-04', type: 'SOFT',    title: '軟性活動 中秋聯歡烤肉', location: '偉婷工廠' },
    { date: '2025-10-08', type: 'VISIT',   title: '職業參訪 瑞煦建築', location: '瑞煦建築' },
    { date: '2025-10-14', type: 'CLOSED',  title: '封閉組聚 準備BOD', location: '富興工廠2F' },
    { date: '2025-10-21', type: 'GENERAL', title: '簡報組聚', location: '富興工廠2F' },
    { date: '2025-10-28', type: 'BOD',     title: 'BOD 打造獲利的金店面', location: '富興工廠2F' },
    { date: '2025-11-04', type: 'SOFT',    title: '軟性活動', location: null },
    { date: '2025-11-11', type: 'GENERAL', title: '簡報組聚', location: '富興工廠2F' },
    { date: '2025-11-18', type: 'CLOSED',  title: '封閉組聚', location: '富興工廠2F' },
    { date: '2025-11-25', type: 'JOINT',   title: '聯合組聚 豐商分會', location: '富興工廠2F' },
    { date: '2025-12-02', type: 'GENERAL', title: '簡報組聚', location: '富興工廠2F' },
    { date: '2025-12-09', type: 'CLOSED',  title: '封閉組聚', location: '富興工廠2F' },
    { date: '2025-12-16', type: 'GENERAL', title: '簡報組聚', location: '富興工廠2F' },
    { date: '2025-12-23', type: 'BOD',     title: 'BOD', location: '富興工廠2F' },
    { date: '2025-12-30', type: 'SOFT',    title: '軟性活動', location: null },
  ]

  let created = 0
  for (const r of rows) {
    const startAt = build(r.date, 18, 30)
    const endAt = build(r.date, 21, 0)
    const exists = await prisma.event.findFirst({ where: { startAt } })
    if (exists) continue

    const base: Prisma.EventCreateInput = {
      startAt,
      endAt,
      type: r.type,
      title: r.title,
      location: r.location ?? undefined,
      allowGuests: r.type !== 'CLOSED',
      allowSpeakers: r.type === 'GENERAL',
      speakerQuota: r.type === 'GENERAL' ? 5 : 0,
      pricingMode: r.type === 'DINNER' ? PricingMode.MANUAL_PER_REG : PricingMode.DEFAULT,
    }

    if (r.type === 'GENERAL') {
      base.guestPriceCents = 25000
    }
    if (r.type === 'BOD') {
      base.bodMemberPriceCents = 30000
      base.bodGuestPriceCents = 60000
    }
    if (r.type === 'DINNER') {
      base.defaultPriceCents = 0
    }

    await prisma.event.create({ data: base })
    created++
  }

  return NextResponse.json({ ok: true, created })
}


