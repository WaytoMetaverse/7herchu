import { prisma } from './prisma'
import { BadgeType } from '@prisma/client'

// 勳章門檻設定
export const BADGE_THRESHOLDS = {
  BRONZE: 3,
  COPPER: 5,
  SILVER: 10,
  GOLD: 30,
  PLATINUM: 80,
  EMERALD: 100,
  DIAMOND: 150,
  MASTER: 200,
  GRANDMASTER: 250,
  ELITE: 300,
} as const

// 根據次數取得勳章等級
export function getBadgeLevel(count: number): keyof typeof BADGE_THRESHOLDS | null {
  if (count >= BADGE_THRESHOLDS.ELITE) return 'ELITE'
  if (count >= BADGE_THRESHOLDS.GRANDMASTER) return 'GRANDMASTER'
  if (count >= BADGE_THRESHOLDS.MASTER) return 'MASTER'
  if (count >= BADGE_THRESHOLDS.DIAMOND) return 'DIAMOND'
  if (count >= BADGE_THRESHOLDS.EMERALD) return 'EMERALD'
  if (count >= BADGE_THRESHOLDS.PLATINUM) return 'PLATINUM'
  if (count >= BADGE_THRESHOLDS.GOLD) return 'GOLD'
  if (count >= BADGE_THRESHOLDS.SILVER) return 'SILVER'
  if (count >= BADGE_THRESHOLDS.COPPER) return 'COPPER'
  if (count >= BADGE_THRESHOLDS.BRONZE) return 'BRONZE'
  return null
}

// 取得下一個等級需要的次數
export function getNextLevelThreshold(currentCount: number): number | null {
  const levels = Object.entries(BADGE_THRESHOLDS).sort((a, b) => a[1] - b[1])
  for (const [, threshold] of levels) {
    if (currentCount < threshold) {
      return threshold
    }
  }
  return null
}

// 計算組聚參與次數
export async function getGroupMeetingCount(userId: string): Promise<number> {
  return await prisma.registration.count({
    where: {
      userId,
      status: 'REGISTERED',
      event: {
        type: { in: ['GENERAL', 'JOINT', 'CLOSED'] }
      }
    }
  })
}

// 計算封閉會議參與次數
export async function getClosedMeetingCount(userId: string): Promise<number> {
  return await prisma.registration.count({
    where: {
      userId,
      status: 'REGISTERED',
      event: {
        type: 'CLOSED'
      }
    }
  })
}

// 計算軟性活動參與次數
export async function getSoftActivityCount(userId: string): Promise<number> {
  return await prisma.registration.count({
    where: {
      userId,
      status: 'REGISTERED',
      event: {
        type: 'SOFT'
      }
    }
  })
}

// 計算 BOD 參與次數
export async function getBodCount(userId: string): Promise<number> {
  return await prisma.registration.count({
    where: {
      userId,
      status: 'REGISTERED',
      event: {
        type: 'BOD'
      }
    }
  })
}

// 計算餐敘參與次數
export async function getDinnerCount(userId: string): Promise<number> {
  return await prisma.registration.count({
    where: {
      userId,
      status: 'REGISTERED',
      event: {
        type: 'DINNER'
      }
    }
  })
}

// 計算職業參訪參與次數
export async function getVisitCount(userId: string): Promise<number> {
  return await prisma.registration.count({
    where: {
      userId,
      status: 'REGISTERED',
      event: {
        type: 'VISIT'
      }
    }
  })
}

// 計算聯合組聚參與次數
export async function getJointCount(userId: string): Promise<number> {
  return await prisma.registration.count({
    where: {
      userId,
      status: 'REGISTERED',
      event: {
        type: 'JOINT'
      }
    }
  })
}

// 計算便當用餐次數（包含 Registration 和 SpeakerBooking）
export async function getMealServiceCount(userId: string): Promise<number> {
  const [regCount, speakerCount] = await Promise.all([
    prisma.registration.count({
      where: {
        userId,
        status: 'REGISTERED',
        mealCode: { not: null }
      }
    }),
    prisma.speakerBooking.count({
      where: {
        invitedBy: userId,
        mealCode: { not: null }
      }
    })
  ])
  return regCount + speakerCount
}

// 計算簽到次數（包含 Registration 和 SpeakerBooking）
export async function getCheckinCount(userId: string): Promise<number> {
  const [regCount, speakerCount] = await Promise.all([
    prisma.registration.count({
      where: {
        userId,
        status: 'REGISTERED',
        checkedInAt: { not: null }
      }
    }),
    prisma.speakerBooking.count({
      where: {
        invitedBy: userId,
        checkedInAt: { not: null }
      }
    })
  ])
  return regCount + speakerCount
}

// 計算講師次數（統計 SpeakerBooking 中 name 出現次數）
export async function getSpeakerCount(userId: string): Promise<number> {
  // 統計該用戶邀請的講師姓名出現次數
  const speakers = await prisma.speakerBooking.findMany({
    where: {
      invitedBy: userId
    },
    select: {
      name: true
    }
  })
  
  // 計算每個講師姓名出現的次數
  const nameCounts = new Map<string, number>()
  for (const speaker of speakers) {
    const count = nameCounts.get(speaker.name) || 0
    nameCounts.set(speaker.name, count + 1)
  }
  
  // 返回總次數（所有講師姓名出現次數的總和）
  return Array.from(nameCounts.values()).reduce((sum, count) => sum + count, 0)
}

// 根據勳章類型計算次數
export async function getBadgeCount(userId: string, badgeType: BadgeType): Promise<number> {
  switch (badgeType) {
    case 'GROUP_MEETING':
      return await getGroupMeetingCount(userId)
    case 'CLOSED_MEETING':
      return await getClosedMeetingCount(userId)
    case 'SOFT_ACTIVITY':
      return await getSoftActivityCount(userId)
    case 'BOD':
      return await getBodCount(userId)
    case 'DINNER':
      return await getDinnerCount(userId)
    case 'VISIT':
      return await getVisitCount(userId)
    case 'JOINT':
      return await getJointCount(userId)
    case 'MEAL_SERVICE':
      return await getMealServiceCount(userId)
    case 'CHECKIN':
      return await getCheckinCount(userId)
    case 'SPEAKER':
      return await getSpeakerCount(userId)
    default:
      return 0
  }
}

// 計算所有活動參與次數總和
export async function getAllEventCount(userId: string): Promise<number> {
  return await prisma.registration.count({
    where: {
      userId,
      status: 'REGISTERED',
      event: {
        type: { in: ['GENERAL', 'CLOSED', 'BOD', 'DINNER', 'JOINT', 'SOFT', 'VISIT'] }
      }
    }
  })
}

// 計算報名但未簽到次數
export async function getNoShowCount(userId: string): Promise<number> {
  return await prisma.registration.count({
    where: {
      userId,
      status: 'REGISTERED',
      checkedInAt: null
    }
  })
}

// 計算簡報組聚出席次數
export async function getGeneralAttendanceCount(userId: string): Promise<number> {
  return await prisma.registration.count({
    where: {
      userId,
      status: 'REGISTERED',
      event: {
        type: 'GENERAL'
      },
      checkedInAt: { not: null }
    }
  })
}

// 計算邀請來賓次數（使用 invitedBy 欄位）
export async function getGuestInviteCount(userId: string): Promise<number> {
  const [regCount, speakerCount] = await Promise.all([
    // Registration 中 invitedBy = userId 的記錄（所有角色）
    prisma.registration.count({
      where: {
        invitedBy: userId,
        status: 'REGISTERED'
      }
    }),
    // SpeakerBooking 中 invitedBy = userId 的記錄
    prisma.speakerBooking.count({
      where: {
        invitedBy: userId
      }
    })
  ])
  return regCount + speakerCount
}

