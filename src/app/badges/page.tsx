import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getDisplayName } from '@/lib/displayName'
import { getUserBadgeDetails, unlockUserBadges } from '@/lib/badgeUnlock'
import { getBadgeLevel, getNextLevelThreshold, BADGE_THRESHOLDS } from '@/lib/badges'
import { BadgeType } from '@prisma/client'
import { 
  Home, 
  Lock, 
  PartyPopper, 
  Briefcase, 
  UtensilsCrossed, 
  MapPin, 
  Handshake, 
  Bowl, 
  CheckCircle, 
  Mic 
} from 'lucide-react'

const BADGE_CONFIG: Record<BadgeType, { name: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  GROUP_MEETING: { name: '組聚達人', icon: Home, color: 'bg-blue-500' },
  CLOSED_MEETING: { name: '封閉勇者', icon: Lock, color: 'bg-gray-500' },
  SOFT_ACTIVITY: { name: '玩樂達人', icon: PartyPopper, color: 'bg-pink-500' },
  BOD: { name: '會議老司機', icon: Briefcase, color: 'bg-purple-500' },
  DINNER: { name: '餐敘勇士', icon: UtensilsCrossed, color: 'bg-orange-500' },
  VISIT: { name: '探索者', icon: MapPin, color: 'bg-green-500' },
  JOINT: { name: '外交官', icon: Handshake, color: 'bg-yellow-500' },
  MEAL_SERVICE: { name: '便當大胃王', icon: Bowl, color: 'bg-red-500' },
  CHECKIN: { name: '簽到忠實粉', icon: CheckCircle, color: 'bg-teal-500' },
  SPEAKER: { name: '講師大師', icon: Mic, color: 'bg-indigo-500' }
}

const LEVEL_COLORS: Record<string, string> = {
  BRONZE: '#CD7F32',
  COPPER: '#B87333',
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  PLATINUM: '#E5E4E2',
  EMERALD: '#50C878',
  DIAMOND: '#B9F2FF',
  MASTER: '#9B59B6',
  GRANDMASTER: '#6A1B9A',
  ELITE: '#FF0000'
}

const LEVEL_NAMES: Record<string, string> = {
  BRONZE: '銅牌',
  COPPER: '青銅牌',
  SILVER: '白銀牌',
  GOLD: '黃金牌',
  PLATINUM: '白金牌',
  EMERALD: '翡翠牌',
  DIAMOND: '鑽石牌',
  MASTER: '大師牌',
  GRANDMASTER: '宗師牌',
  ELITE: '菁英牌'
}

export default async function BadgesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    redirect('/auth/signin')
  }

  // 解鎖勳章
  await unlockUserBadges(user.id)

  // 取得勳章詳細資訊
  const badgeDetails = await getUserBadgeDetails(user.id)
  const displayName = getDisplayName(user)

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">我的獎牌</h1>
        <div className="text-sm text-gray-500">{displayName}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {badgeDetails.map((detail) => {
          const config = BADGE_CONFIG[detail.badgeType]
          const Icon = config.icon
          const currentLevel = detail.currentLevel
          const nextThreshold = getNextLevelThreshold(detail.count)
          const progress = nextThreshold 
            ? Math.min((detail.count / nextThreshold) * 100, 100)
            : 100

          return (
            <div
              key={detail.badgeType}
              className="bg-white rounded-lg border p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full ${config.color} flex items-center justify-center text-white`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{config.name}</h3>
                  <div className="text-sm text-gray-500">
                    {detail.count} 次
                  </div>
                </div>
                {currentLevel && (
                  <div
                    className="px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: LEVEL_COLORS[currentLevel] }}
                  >
                    {LEVEL_NAMES[currentLevel]}
                  </div>
                )}
              </div>

              {nextThreshold && detail.count < nextThreshold && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>進度</span>
                    <span>
                      {detail.count} / {nextThreshold}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    距離 {LEVEL_NAMES[getBadgeLevel(nextThreshold!) || ''] || '下一等級'} 還差 {nextThreshold! - detail.count} 次
                  </div>
                </div>
              )}

              {!nextThreshold && (
                <div className="text-xs text-green-600 font-medium">
                  已達到最高等級！
                </div>
              )}

              {!currentLevel && (
                <div className="text-xs text-gray-400">
                  尚未解鎖（需要 {BADGE_THRESHOLDS.BRONZE} 次）
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

