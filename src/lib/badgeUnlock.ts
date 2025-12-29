import { prisma } from './prisma'
import { BadgeType, BadgeLevel } from '@prisma/client'
import { getBadgeCount, getBadgeLevel, BADGE_THRESHOLDS } from './badges'

// 解鎖用戶的勳章
export async function unlockUserBadges(userId: string) {
  const badgeTypes: BadgeType[] = [
    'GROUP_MEETING',
    'CLOSED_MEETING',
    'SOFT_ACTIVITY',
    'BOD',
    'DINNER',
    'VISIT',
    'JOINT',
    'MEAL_SERVICE',
    'CHECKIN',
    'SPEAKER'
  ]

  for (const badgeType of badgeTypes) {
    const count = await getBadgeCount(userId, badgeType)
    const currentLevel = getBadgeLevel(count)

    if (!currentLevel) continue

    // 檢查所有已達到的等級
    const levels: BadgeLevel[] = []
    if (count >= BADGE_THRESHOLDS.BRONZE) levels.push('BRONZE')
    if (count >= BADGE_THRESHOLDS.COPPER) levels.push('COPPER')
    if (count >= BADGE_THRESHOLDS.SILVER) levels.push('SILVER')
    if (count >= BADGE_THRESHOLDS.GOLD) levels.push('GOLD')
    if (count >= BADGE_THRESHOLDS.PLATINUM) levels.push('PLATINUM')
    if (count >= BADGE_THRESHOLDS.EMERALD) levels.push('EMERALD')
    if (count >= BADGE_THRESHOLDS.DIAMOND) levels.push('DIAMOND')
    if (count >= BADGE_THRESHOLDS.MASTER) levels.push('MASTER')
    if (count >= BADGE_THRESHOLDS.GRANDMASTER) levels.push('GRANDMASTER')
    if (count >= BADGE_THRESHOLDS.ELITE) levels.push('ELITE')

    // 為每個已達到的等級建立或更新勳章記錄
    for (const level of levels) {
      await prisma.userBadge.upsert({
        where: {
          userId_badgeType_level: {
            userId,
            badgeType,
            level
          }
        },
        create: {
          userId,
          badgeType,
          level,
          count
        },
        update: {
          count
        }
      })
    }
  }
}

// 取得用戶所有勳章（顯示最高等級）
export async function getUserBadges(userId: string) {
  const badges = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: [
      { badgeType: 'asc' },
      { level: 'desc' }
    ]
  })

  // 只保留每個勳章類型的最高等級
  const badgeMap = new Map<BadgeType, typeof badges[0]>()
  for (const badge of badges) {
    const existing = badgeMap.get(badge.badgeType)
    if (!existing || compareLevel(badge.level, existing.level) > 0) {
      badgeMap.set(badge.badgeType, badge)
    }
  }

  return Array.from(badgeMap.values())
}

// 比較等級順序（數字越大等級越高）
function compareLevel(a: BadgeLevel, b: BadgeLevel): number {
  const order: BadgeLevel[] = [
    'BRONZE',
    'COPPER',
    'SILVER',
    'GOLD',
    'PLATINUM',
    'EMERALD',
    'DIAMOND',
    'MASTER',
    'GRANDMASTER',
    'ELITE'
  ]
  return order.indexOf(a) - order.indexOf(b)
}

// 取得用戶勳章詳細資訊（包含當前次數和進度）
export async function getUserBadgeDetails(userId: string) {
  const badgeTypes: BadgeType[] = [
    'GROUP_MEETING',
    'CLOSED_MEETING',
    'SOFT_ACTIVITY',
    'BOD',
    'DINNER',
    'VISIT',
    'JOINT',
    'MEAL_SERVICE',
    'CHECKIN',
    'SPEAKER'
  ]

  const details = []
  for (const badgeType of badgeTypes) {
    const count = await getBadgeCount(userId, badgeType)
    const currentLevel = getBadgeLevel(count)
    const highestBadge = await prisma.userBadge.findFirst({
      where: {
        userId,
        badgeType
      },
      orderBy: {
        level: 'desc'
      }
    })

    details.push({
      badgeType,
      count,
      currentLevel,
      highestBadge: highestBadge || null
    })
  }

  return details
}

