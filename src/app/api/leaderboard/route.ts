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
    // 取得所有活躍用戶
    const users = await prisma.user.findMany({
      where: { isActive: true },
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

    // 9. 講師大師 - 講師姓名累積最多
    const speakerLeaderboard = await Promise.all(
      users.map(async (user) => {
        // 統計該用戶邀請的講師姓名出現次數
        const speakers = await prisma.speakerBooking.findMany({
          where: {
            invitedBy: user.id
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
        
        // 返回總次數
        const count = Array.from(nameCounts.values()).reduce((sum, c) => sum + c, 0)
        return {
          userId: user.id,
          displayName: getDisplayName(user),
          count
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

    // 12. 來賓召喚師 - 統計 invitedBy 欄位中相同 userId 的出現次數
    const guestInviteLeaderboard = await Promise.all(
      users.map(async (user) => {
        // 統計 Registration 中 invitedBy = userId 的記錄
        const regCount = await prisma.registration.count({
          where: {
            invitedBy: user.id,
            status: 'REGISTERED'
          }
        })
        // 統計 SpeakerBooking 中 invitedBy = userId 的記錄
        const speakerCount = await prisma.speakerBooking.count({
          where: {
            invitedBy: user.id
          }
        })
        const count = regCount + speakerCount
        return {
          userId: user.id,
          displayName: getDisplayName(user),
          count
        }
      })
    )
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

