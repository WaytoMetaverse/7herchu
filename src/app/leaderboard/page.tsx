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
import {
  Trophy,
  Soup,
  XCircle,
  Home,
  Lock,
  Briefcase,
  PartyPopper,
  Handshake,
  Mic,
  UtensilsCrossed,
  MapPin,
  UserPlus
} from 'lucide-react'

const LEADERBOARD_CONFIG = [
  { key: 'participation', name: '參與王', description: '所有活動參加次數總和', icon: Trophy, color: 'bg-yellow-500' },
  { key: 'meal', name: '便當王', description: '便當用餐次數', icon: Soup, color: 'bg-red-500' },
  { key: 'noShow', name: '爽約魔人', description: '報名但未簽到次數', icon: XCircle, color: 'bg-gray-500' },
  { key: 'generalAttendance', name: '組聚鐵人', description: '簡報組聚出席次數', icon: Home, color: 'bg-blue-500' },
  { key: 'closedMeeting', name: '沒什麼用', description: '封閉會議參與次數（由少到多）', icon: Lock, color: 'bg-gray-400' },
  { key: 'bod', name: '沒來賓沒有我', description: 'BOD 參與次數/活動總參與次數', icon: Briefcase, color: 'bg-purple-500' },
  { key: 'softActivity', name: '玩樂跑第一', description: '軟性參與次數/活動總參與次數', icon: PartyPopper, color: 'bg-pink-500' },
  { key: 'joint', name: '外交官', description: '聯合組聚參與次數', icon: Handshake, color: 'bg-yellow-400' },
  { key: 'speaker', name: '講師大師', description: '講師邀請最多', icon: Mic, color: 'bg-indigo-500' },
  { key: 'dinner', name: '乾杯王', description: '餐敘參與最多', icon: UtensilsCrossed, color: 'bg-orange-500' },
  { key: 'visit', name: '探索者', description: '職業參訪參與最多', icon: MapPin, color: 'bg-green-500' },
  { key: 'guestInvite', name: '來賓召喚師', description: '邀請來賓名字出現最多', icon: UserPlus, color: 'bg-teal-500' }
]

export default async function LeaderboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/auth/signin')
  }

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
  bodLeaderboard.sort((a, b) => b.count - a.count)

  const softActivityLeaderboard = await Promise.all(
    users.map(async (user) => {
      const softCount = await getSoftActivityCount(user.id)
      const totalCount = await getAllEventCount(user.id)
      // 計算比例，如果總參與次數為 0，比例為 0
      const ratio = totalCount > 0 ? softCount / totalCount : 0
      return {
        userId: user.id,
        displayName: getDisplayName(user),
        count: ratio, // 存儲比例
        softCount, // 保留軟性活動次數用於顯示
        totalCount // 保留總次數用於顯示
      }
    })
  )
  // 只顯示有參與活動的用戶，按比例從大到小排序
  const filteredSoftActivityLeaderboard = softActivityLeaderboard.filter(item => item.totalCount > 0)
  filteredSoftActivityLeaderboard.sort((a, b) => b.count - a.count)

  const jointLeaderboard = await Promise.all(
    users.map(async (user) => ({
      userId: user.id,
      displayName: getDisplayName(user),
      count: await getJointCount(user.id)
    }))
  )
  jointLeaderboard.sort((a, b) => b.count - a.count)

  // 講師大師 - 講師邀請最多的人（只從來賓庫抓數據，跟來賓召喚師一樣）
  const speakerProfiles = await prisma.guestSpeakerProfile.findMany({
    where: { 
      role: 'SPEAKER',
      invitedBy: { not: null }
    },
    select: { invitedBy: true }
  })

  // 統計每個邀請人名字的出現次數
  const speakerInviterCounts = new Map<string, number>()
  speakerProfiles.forEach((profile: { invitedBy: string | null }) => {
    if (profile.invitedBy) {
      speakerInviterCounts.set(profile.invitedBy, (speakerInviterCounts.get(profile.invitedBy) || 0) + 1)
    }
  })
  
  // 直接按名字和次數排名
  const speakerLeaderboard = Array.from(speakerInviterCounts.entries())
    .map(([name, count]) => ({
      userId: '', // 沒有對應的用戶ID
      displayName: name,
      count
    }))
    .sort((a, b) => b.count - a.count)

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

  // 來賓召喚師 - 從來賓庫抓邀請人名字做加總，直接按次數排名
  const allGuestProfiles = await prisma.guestSpeakerProfile.findMany({
    where: {
      invitedBy: { not: null }
    },
    select: { invitedBy: true }
  })

  // 統計每個邀請人名字的出現次數
  const inviterNameCounts = new Map<string, number>()
  allGuestProfiles.forEach((profile: { invitedBy: string | null }) => {
    if (profile.invitedBy) {
      inviterNameCounts.set(profile.invitedBy, (inviterNameCounts.get(profile.invitedBy) || 0) + 1)
    }
  })

  // 直接按名字和次數排名
  const guestInviteLeaderboard = Array.from(inviterNameCounts.entries())
    .map(([name, count]) => ({
      userId: '', // 沒有對應的用戶ID
      displayName: name,
      count
    }))
    .sort((a, b) => b.count - a.count)

  // 過濾掉總參與次數為 0 的用戶（對於 bod 排行榜）
  const filteredBodLeaderboard = bodLeaderboard.filter(item => item.totalCount > 0)

  const data = {
    participation: participationLeaderboard.slice(0, 3),
    meal: mealLeaderboard.slice(0, 3),
    noShow: noShowLeaderboard.slice(0, 3),
    generalAttendance: generalAttendanceLeaderboard.slice(0, 3),
    closedMeeting: closedMeetingLeaderboard.slice(0, 3),
    bod: filteredBodLeaderboard.slice(0, 3),
    softActivity: filteredSoftActivityLeaderboard.slice(0, 3),
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
          const leaderboard = (data as Record<string, Array<{ userId: string; displayName: string; count: number; bodCount?: number; softCount?: number; totalCount?: number }>>)[config.key] || []

          const Icon = config.icon
          return (
            <div
              key={config.key}
              className="bg-white rounded-lg border p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center text-white`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-lg">{config.name}</h3>
                  <p className="text-sm text-gray-500">{config.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                {leaderboard.length > 0 && (config.key === 'closedMeeting' || leaderboard.some(item => item.count > 0)) ? (
                  leaderboard.map((item: { userId: string; displayName: string; count: number; bodCount?: number; softCount?: number; totalCount?: number }, index: number) => (
                    <div
                      key={item.userId}
                      className="flex items-center gap-2 p-2 rounded bg-gray-50"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
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
                      <span className="font-medium flex-1">{item.displayName}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-400 text-center py-4">
                    從缺
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

