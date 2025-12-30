import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDisplayName } from '@/lib/displayName'
import {
  getAllEventCount,
  getMealServiceCount,
  getNoShowCount,
  getGeneralAttendanceCount,
  getClosedMeetingCount,
  getBodCount,
  getSoftActivityCount,
  getJointCount,
  getDinnerCount,
  getVisitCount,
  getGuestInviteCount
} from '@/lib/badges'

export async function GET() {
  try {
    // 取得所有活躍用戶（排除信銘）
    const users = await prisma.user.findMany({
      where: { 
        isActive: true,
        NOT: [
          { name: { contains: '信銘' } },
          { nickname: { contains: '信銘' } },
          { email: { contains: '信銘' } }
        ]
      },
      select: {
        id: true,
        name: true,
        nickname: true
      }
    })

    // 1. 參與王 - 所有活動參加次數總和
    const participationLeaderboard = await Promise.all(
      users.map(async (user) => ({
        userId: user.id,
        displayName: getDisplayName(user),
        count: await getAllEventCount(user.id)
      }))
    )
    participationLeaderboard.sort((a, b) => b.count - a.count)

    // 2. 便當王 - 便當用餐次數
    const mealLeaderboard = await Promise.all(
      users.map(async (user) => ({
        userId: user.id,
        displayName: getDisplayName(user),
        count: await getMealServiceCount(user.id)
      }))
    )
    mealLeaderboard.sort((a, b) => b.count - a.count)

    // 3. 爽約魔人 - 報名但未簽到次數
    const noShowLeaderboard = await Promise.all(
      users.map(async (user) => ({
        userId: user.id,
        displayName: getDisplayName(user),
        count: await getNoShowCount(user.id)
      }))
    )
    noShowLeaderboard.sort((a, b) => b.count - a.count)

    // 4. 組聚鐵人 - 簡報組聚出席次數
    const generalAttendanceLeaderboard = await Promise.all(
      users.map(async (user) => ({
        userId: user.id,
        displayName: getDisplayName(user),
        count: await getGeneralAttendanceCount(user.id)
      }))
    )
    generalAttendanceLeaderboard.sort((a, b) => b.count - a.count)

    // 5. 沒什麼用 - 封閉會議參與次數（由少到多）
    const closedMeetingLeaderboard = await Promise.all(
      users.map(async (user) => ({
        userId: user.id,
        displayName: getDisplayName(user),
        count: await getClosedMeetingCount(user.id)
      }))
    )
    closedMeetingLeaderboard.sort((a, b) => a.count - b.count)

    // 6. 沒來賓沒有我 - BOD 參與次數/活動總參與次數
    const bodLeaderboard = await Promise.all(
      users.map(async (user) => {
        const bodCount = await getBodCount(user.id)
        const totalCount = await getAllEventCount(user.id)
        // 計算比例，如果總參與次數為 0，比例為 0
        const ratio = totalCount > 0 ? bodCount / totalCount : 0
        return {
          userId: user.id,
          displayName: getDisplayName(user),
          count: ratio, // 存儲比例
          bodCount, // 保留 BOD 次數用於顯示
          totalCount // 保留總次數用於顯示
        }
      })
    )
    // 只顯示有參與活動的用戶，按比例從大到小排序
    const filteredBodLeaderboard = bodLeaderboard.filter(item => item.totalCount > 0)
    filteredBodLeaderboard.sort((a, b) => b.count - a.count)

    // 7. 玩樂跑第一 - 軟性活動參與次數
    const softActivityLeaderboard = await Promise.all(
      users.map(async (user) => ({
        userId: user.id,
        displayName: getDisplayName(user),
        count: await getSoftActivityCount(user.id)
      }))
    )
    softActivityLeaderboard.sort((a, b) => b.count - a.count)

    // 8. 外交官 - 聯合組聚參與次數
    const jointLeaderboard = await Promise.all(
      users.map(async (user) => ({
        userId: user.id,
        displayName: getDisplayName(user),
        count: await getJointCount(user.id)
      }))
    )
    jointLeaderboard.sort((a, b) => b.count - a.count)

    // 9. 講師大師 - 統計名字出現次數最多者（不核對ID）
    const allSpeakers = await prisma.speakerBooking.findMany({
      select: { name: true }
    })
    const speakerNameCounts = new Map<string, number>()
    for (const speaker of allSpeakers) {
      const count = speakerNameCounts.get(speaker.name) || 0
      speakerNameCounts.set(speaker.name, count + 1)
    }
    
    // 找出每個用戶邀請的講師名字出現次數總和
    const speakerLeaderboard = await Promise.all(
      users.map(async (user) => {
        const speakers = await prisma.speakerBooking.findMany({
          where: { invitedBy: user.id },
          select: { name: true }
        })
        // 統計該用戶邀請的講師名字在整個系統中出現的總次數
        let totalCount = 0
        for (const speaker of speakers) {
          totalCount += speakerNameCounts.get(speaker.name) || 0
        }
        return {
          userId: user.id,
          displayName: getDisplayName(user),
          count: totalCount
        }
      })
    )
    speakerLeaderboard.sort((a, b) => b.count - a.count)

    // 10. 乾杯王 - 餐敘參與最多
    const dinnerLeaderboard = await Promise.all(
      users.map(async (user) => ({
        userId: user.id,
        displayName: getDisplayName(user),
        count: await getDinnerCount(user.id)
      }))
    )
    dinnerLeaderboard.sort((a, b) => b.count - a.count)

    // 11. 探索者 - 職業參訪參與最多
    const visitLeaderboard = await Promise.all(
      users.map(async (user) => ({
        userId: user.id,
        displayName: getDisplayName(user),
        count: await getVisitCount(user.id)
      }))
    )
    visitLeaderboard.sort((a, b) => b.count - a.count)

    // 12. 來賓召喚師 - 統計邀請人名字出現次數最多者
    // 先取得所有 Registration 和 SpeakerBooking 的 invitedBy，然後找到對應用戶的名字
    const [allRegs, allSpeakersForInvite] = await Promise.all([
      prisma.registration.findMany({
        where: {
          invitedBy: { not: null },
          status: 'REGISTERED'
        },
        select: { invitedBy: true }
      }),
      prisma.speakerBooking.findMany({
        where: {
          invitedBy: { not: null }
        },
        select: { invitedBy: true }
      })
    ])
    
    // 取得所有邀請人的用戶資訊
    const inviterIds = new Set<string>()
    allRegs.forEach(reg => { if (reg.invitedBy) inviterIds.add(reg.invitedBy) })
    allSpeakersForInvite.forEach(speaker => { if (speaker.invitedBy) inviterIds.add(speaker.invitedBy) })
    
    const inviters = await prisma.user.findMany({
      where: { id: { in: Array.from(inviterIds) } },
      select: { id: true, name: true, nickname: true }
    })
    
    const inviterNameMap = new Map<string, string>()
    inviters.forEach(inviter => {
      const displayName = getDisplayName(inviter)
      inviterNameMap.set(inviter.id, displayName)
    })
    
    // 統計每個邀請人名字的出現次數
    const inviterNameCounts = new Map<string, number>()
    allRegs.forEach(reg => {
      if (reg.invitedBy) {
        const name = inviterNameMap.get(reg.invitedBy) || '未知'
        inviterNameCounts.set(name, (inviterNameCounts.get(name) || 0) + 1)
      }
    })
    allSpeakersForInvite.forEach(speaker => {
      if (speaker.invitedBy) {
        const name = inviterNameMap.get(speaker.invitedBy) || '未知'
        inviterNameCounts.set(name, (inviterNameCounts.get(name) || 0) + 1)
      }
    })
    
    // 為每個用戶統計其名字的出現次數
    const guestInviteLeaderboard = users.map(user => {
      const displayName = getDisplayName(user)
      const count = inviterNameCounts.get(displayName) || 0
      return {
        userId: user.id,
        displayName,
        count
      }
    })
    guestInviteLeaderboard.sort((a, b) => b.count - a.count)

    return NextResponse.json({
      participation: participationLeaderboard.slice(0, 3),
      meal: mealLeaderboard.slice(0, 3),
      noShow: noShowLeaderboard.slice(0, 3),
      generalAttendance: generalAttendanceLeaderboard.slice(0, 3),
      closedMeeting: closedMeetingLeaderboard.slice(0, 3),
      bod: filteredBodLeaderboard.slice(0, 3),
      softActivity: softActivityLeaderboard.slice(0, 3),
      joint: jointLeaderboard.slice(0, 3),
      speaker: speakerLeaderboard.slice(0, 3),
      dinner: dinnerLeaderboard.slice(0, 3),
      visit: visitLeaderboard.slice(0, 3),
      guestInvite: guestInviteLeaderboard.slice(0, 3)
    })
  } catch (error) {
    console.error('Leaderboard API error:', error)
    return NextResponse.json({ error: '取得排行榜失敗' }, { status: 500 })
  }
}

