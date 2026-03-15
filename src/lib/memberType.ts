import { prisma } from '@/lib/prisma'
import type { MemberType } from '@prisma/client'

/** 取得前一個月的 YYYY-MM */
export function getPreviousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 取得成員在「指定月份」的類型（固定/單次）。
 * 依 MemberTypeHistory 依月份生效：取 effectiveMonth <= month 的最新一筆；
 * 若無歷史則用 MemberProfile.memberType（目前類型）。
 */
export async function getMemberTypeForMonth(
  userId: string,
  month: string
): Promise<MemberType> {
  const history = await prisma.memberTypeHistory.findFirst({
    where: { userId, effectiveMonth: { lte: month } },
    orderBy: { effectiveMonth: 'desc' },
    select: { memberType: true }
  })
  if (history) return history.memberType

  const profile = await prisma.memberProfile.findUnique({
    where: { userId },
    select: { memberType: true }
  })
  return profile?.memberType ?? 'SINGLE'
}

/**
 * 批次取得多個成員在各月份的類型，減少 N+1 查詢。
 * 回傳 Map<userId, Map<month, MemberType>>。
 */
export async function getMemberTypesForMonths(
  userIds: string[],
  months: string[]
): Promise<Map<string, Map<string, MemberType>>> {
  const result = new Map<string, Map<string, MemberType>>()
  for (const uid of userIds) {
    result.set(uid, new Map())
  }
  if (userIds.length === 0 || months.length === 0) return result

  const allHistory = await prisma.memberTypeHistory.findMany({
    where: { userId: { in: userIds }, effectiveMonth: { lte: months[months.length - 1] } },
    orderBy: [{ userId: 'asc' }, { effectiveMonth: 'desc' }]
  })

  const profiles = await prisma.memberProfile.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, memberType: true }
  })
  const profileMap = new Map(profiles.map(p => [p.userId, p.memberType]))

  for (const uid of userIds) {
    const byMonth = result.get(uid)!
    const userHistory = allHistory
      .filter(h => h.userId === uid)
      .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth))
    const defaultType = profileMap.get(uid) ?? 'SINGLE'
    for (const month of months) {
      const h = userHistory.find(x => x.effectiveMonth <= month)
      byMonth.set(month, h ? h.memberType : defaultType)
    }
  }
  return result
}
