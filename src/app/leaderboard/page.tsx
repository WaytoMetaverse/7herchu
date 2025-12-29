import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
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

const LEADERBOARD_CONFIG = [
  { key: 'participation', name: '參與王', description: '所有活動參加次數總和' },
  { key: 'meal', name: '便當王', description: '便當用餐次數' },
  { key: 'noShow', name: '爽約魔人', description: '報名但未簽到次數' },
  { key: 'generalAttendance', name: '組聚鐵人', description: '簡報組聚出席次數' },
  { key: 'closedMeeting', name: '沒什麼用', description: '封閉會議參與次數（由少到多）' },
  { key: 'bod', name: '沒來賓沒有我', description: 'BOD 參與次數' },
  { key: 'softActivity', name: '玩樂跑第一', description: '軟性活動參與次數' },
  { key: 'joint', name: '外交官', description: '聯合組聚參與次數' },
  { key: 'speaker', name: '講師大師', description: '講師姓名累積最多' },
  { key: 'dinner', name: '乾杯王', description: '餐敘參與最多' },
  { key: 'visit', name: '探索者', description: '職業參訪參與最多' },
  { key: 'guestInvite', name: '來賓召喚師', description: '邀請來賓名字出現最多' }
]

export default async function LeaderboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // 取得所有活躍用戶
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      nickname: true
    }
  })

  // 計算所有排行榜數據
  const participationLeaderboard = await Promise.all(
    users.map(async (user) => ({
      userId: user.id,
      displayName: getDisplayName(user),
      count: await getAllEventCount(user.id)
    }))
  )
  participationLeaderboard.sort((a, b) => b.count - a.count)

  const mealLeaderboard = await Promise.all(
    users.map(async (user) => ({
      userId: user.id,
      displayName: getDisplayName(user),
      count: await getMealServiceCount(user.id)
    }))
  )
  mealLeaderboard.sort((a, b) => b.count - a.count)

  const noShowLeaderboard = await Promise.all(
    users.map(async (user) => ({
      userId: user.id,
      displayName: getDisplayName(user),
      count: await getNoShowCount(user.id)
    }))
  )
  noShowLeaderboard.sort((a, b) => b.count - a.count)

  const generalAttendanceLeaderboard = await Promise.all(
    users.map(async (user) => ({
      userId: user.id,
      displayName: getDisplayName(user),
      count: await getGeneralAttendanceCount(user.id)
    }))
  )
  generalAttendanceLeaderboard.sort((a, b) => b.count - a.count)

  const closedMeetingLeaderboard = await Promise.all(
    users.map(async (user) => ({
      userId: user.id,
      displayName: getDisplayName(user),
      count: await getClosedMeetingCount(user.id)
    }))
  )
  closedMeetingLeaderboard.sort((a, b) => a.count - b.count)

  const bodLeaderboard = await Promise.all(
    users.map(async (user) => ({
      userId: user.id,
      displayName: getDisplayName(user),
      count: await getBodCount(user.id)
    }))
  )
  bodLeaderboard.sort((a, b) => b.count - a.count)

  const softActivityLeaderboard = await Promise.all(
    users.map(async (user) => ({
      userId: user.id,
      displayName: getDisplayName(user),
      count: await getSoftActivityCount(user.id)
    }))
  )
  softActivityLeaderboard.sort((a, b) => b.count - a.count)

  const jointLeaderboard = await Promise.all(
    users.map(async (user) => ({
      userId: user.id,
      displayName: getDisplayName(user),
      count: await getJointCount(user.id)
    }))
  )
  jointLeaderboard.sort((a, b) => b.count - a.count)

  const speakerLeaderboard = await Promise.all(
    users.map(async (user) => {
      const speakers = await prisma.speakerBooking.findMany({
        where: { invitedBy: user.id },
        select: { name: true }
      })
      const nameCounts = new Map<string, number>()
      for (const speaker of speakers) {
        const count = nameCounts.get(speaker.name) || 0
        nameCounts.set(speaker.name, count + 1)
      }
      const count = Array.from(nameCounts.values()).reduce((sum, c) => sum + c, 0)
      return {
        userId: user.id,
        displayName: getDisplayName(user),
        count
      }
    })
  )
  speakerLeaderboard.sort((a, b) => b.count - a.count)

  const dinnerLeaderboard = await Promise.all(
    users.map(async (user) => ({
      userId: user.id,
      displayName: getDisplayName(user),
      count: await getDinnerCount(user.id)
    }))
  )
  dinnerLeaderboard.sort((a, b) => b.count - a.count)

  const visitLeaderboard = await Promise.all(
    users.map(async (user) => ({
      userId: user.id,
      displayName: getDisplayName(user),
      count: await getVisitCount(user.id)
    }))
  )
  visitLeaderboard.sort((a, b) => b.count - a.count)

  const guestInviteLeaderboard = await Promise.all(
    users.map(async (user) => ({
      userId: user.id,
      displayName: getDisplayName(user),
      count: await getGuestInviteCount(user.id)
    }))
  )
  guestInviteLeaderboard.sort((a, b) => b.count - a.count)

  const data = {
    participation: participationLeaderboard.slice(0, 3),
    meal: mealLeaderboard.slice(0, 3),
    noShow: noShowLeaderboard.slice(0, 3),
    generalAttendance: generalAttendanceLeaderboard.slice(0, 3),
    closedMeeting: closedMeetingLeaderboard.slice(0, 3),
    bod: bodLeaderboard.slice(0, 3),
    softActivity: softActivityLeaderboard.slice(0, 3),
    joint: jointLeaderboard.slice(0, 3),
    speaker: speakerLeaderboard.slice(0, 3),
    dinner: dinnerLeaderboard.slice(0, 3),
    visit: visitLeaderboard.slice(0, 3),
    guestInvite: guestInviteLeaderboard.slice(0, 3)
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">排行榜</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LEADERBOARD_CONFIG.map((config) => {
          const leaderboard = (data as Record<string, { userId: string; displayName: string; count: number }[]>)[config.key] || []

          return (
            <div
              key={config.key}
              className="bg-white rounded-lg border p-4 space-y-3"
            >
              <div>
                <h3 className="font-medium text-lg">{config.name}</h3>
                <p className="text-sm text-gray-500">{config.description}</p>
              </div>

              <div className="space-y-2">
                {leaderboard.length > 0 ? (
                  leaderboard.map((item: { userId: string; displayName: string; count: number }, index: number) => (
                    <div
                      key={item.userId}
                      className="flex items-center justify-between p-2 rounded bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            index === 0
                              ? 'bg-yellow-500'
                              : index === 1
                              ? 'bg-gray-400'
                              : index === 2
                              ? 'bg-orange-600'
                              : 'bg-gray-300'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <span className="font-medium">{item.displayName}</span>
                      </div>
                      <span className="text-sm text-gray-600">{item.count} 次</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-400 text-center py-4">
                    暫無數據
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

