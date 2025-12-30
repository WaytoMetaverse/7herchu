import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== 驗證排行榜數據 ===\n')

  // 1. 檢查來賓庫數據
  console.log('1. 來賓庫數據統計：')
  const totalProfiles = await prisma.guestSpeakerProfile.count()
  const speakerProfiles = await prisma.guestSpeakerProfile.count({
    where: { role: 'SPEAKER' }
  })
  const profilesWithInviter = await prisma.guestSpeakerProfile.count({
    where: { invitedBy: { not: null } }
  })
  console.log(`   - 總來賓/講師資料數：${totalProfiles}`)
  console.log(`   - 講師資料數（role='SPEAKER'）：${speakerProfiles}`)
  console.log(`   - 有邀請人的資料數：${profilesWithInviter}\n`)

  // 2. 檢查講師資料詳情
  console.log('2. 講師資料詳情（前10筆）：')
  const speakers = await prisma.guestSpeakerProfile.findMany({
    where: { role: 'SPEAKER' },
    select: { name: true, invitedBy: true },
    take: 10
  })
  speakers.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.name} - 邀請人ID: ${s.invitedBy || '無'}`)
  })
  console.log()

  // 3. 檢查有邀請人的資料
  console.log('3. 有邀請人的來賓資料（前10筆）：')
  const profilesWithInvitedBy = await prisma.guestSpeakerProfile.findMany({
    where: { invitedBy: { not: null } },
    select: { name: true, invitedBy: true, role: true },
    take: 10
  })
  profilesWithInvitedBy.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name} (${p.role}) - 邀請人ID: ${p.invitedBy}`)
  })
  console.log()

  // 4. 檢查邀請人ID對應的用戶
  console.log('4. 邀請人ID統計：')
  const allInviterIds = await prisma.guestSpeakerProfile.findMany({
    where: { invitedBy: { not: null } },
    select: { invitedBy: true },
    distinct: ['invitedBy']
  })
  console.log(`   - 不重複的邀請人ID數量：${allInviterIds.length}`)
  
  const inviterIdCounts = new Map<string, number>()
  const allProfiles = await prisma.guestSpeakerProfile.findMany({
    where: { invitedBy: { not: null } },
    select: { invitedBy: true }
  })
  allProfiles.forEach(p => {
    if (p.invitedBy) {
      inviterIdCounts.set(p.invitedBy, (inviterIdCounts.get(p.invitedBy) || 0) + 1)
    }
  })
  
  // 顯示前10個邀請最多的ID
  const topInviterIds = Array.from(inviterIdCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  console.log('   - 邀請次數最多的ID（前10）：')
  topInviterIds.forEach(([id, count], i) => {
    console.log(`     ${i + 1}. ID: ${id} - 邀請次數: ${count}`)
  })
  console.log()

  // 5. 檢查這些ID對應的用戶
  console.log('5. 邀請人ID對應的用戶：')
  const userIds = topInviterIds.map(([id]) => id)
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, nickname: true }
  })
  users.forEach(user => {
    const count = inviterIdCounts.get(user.id) || 0
    const displayName = user.nickname || user.name || '未知'
    console.log(`   - ${displayName} (${user.name}) - ID: ${user.id} - 邀請次數: ${count}`)
  })
  console.log()

  // 6. 檢查內部成員升講師的資料
  console.log('6. 內部成員升講師的資料：')
  const internalSpeakers = await prisma.registration.findMany({
    where: {
      role: 'SPEAKER',
      userId: { not: null },
      status: 'REGISTERED'
    },
    select: {
      name: true,
      invitedBy: true,
      user: {
        select: { name: true, nickname: true }
      }
    },
    take: 10
  })
  console.log(`   - 內部成員升講師的報名數：${internalSpeakers.length}`)
  internalSpeakers.forEach((reg, i) => {
    const name = reg.name || (reg.user ? `${reg.user.nickname || reg.user.name}` : '未知')
    console.log(`   ${i + 1}. ${name} - 邀請人ID: ${reg.invitedBy || '無'}`)
  })
  console.log()

  // 7. 模擬計算講師大師排行榜（前5名）
  console.log('7. 講師大師排行榜計算（模擬前5名）：')
  const allUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, nickname: true },
    take: 20 // 只檢查前20個用戶以加快速度
  })

  // 取得所有講師名字
  const allGuestSpeakers = await prisma.guestSpeakerProfile.findMany({
    where: { role: 'SPEAKER' },
    select: { name: true }
  })
  const allInternalSpeakers = await prisma.registration.findMany({
    where: {
      role: 'SPEAKER',
      userId: { not: null },
      status: 'REGISTERED'
    },
    select: {
      name: true,
      user: {
        select: { name: true, nickname: true }
      }
    }
  })

  // 統計講師名字出現次數
  const speakerNameCounts = new Map<string, number>()
  allGuestSpeakers.forEach(speaker => {
    speakerNameCounts.set(speaker.name, (speakerNameCounts.get(speaker.name) || 0) + 1)
  })
  allInternalSpeakers.forEach(reg => {
    const name = reg.name || (reg.user ? `${reg.user.nickname || reg.user.name}` : '未知')
    speakerNameCounts.set(name, (speakerNameCounts.get(name) || 0) + 1)
  })

  // 計算每個用戶的分數
  const speakerScores = await Promise.all(
    allUsers.map(async (user) => {
      const invitedGuestSpeakers = await prisma.guestSpeakerProfile.findMany({
        where: {
          role: 'SPEAKER',
          invitedBy: user.id
        },
        select: { name: true }
      })
      
      const invitedInternalSpeakers = await prisma.registration.findMany({
        where: {
          role: 'SPEAKER',
          invitedBy: user.id,
          status: 'REGISTERED'
        },
        select: {
          name: true,
          user: {
            select: { name: true, nickname: true }
          }
        }
      })
      
      let totalCount = 0
      invitedGuestSpeakers.forEach(speaker => {
        totalCount += speakerNameCounts.get(speaker.name) || 0
      })
      invitedInternalSpeakers.forEach(reg => {
        const name = reg.name || (reg.user ? `${reg.user.nickname || reg.user.name}` : '未知')
        totalCount += speakerNameCounts.get(name) || 0
      })
      
      return {
        userId: user.id,
        displayName: user.nickname || user.name || '未知',
        count: totalCount,
        invitedGuestCount: invitedGuestSpeakers.length,
        invitedInternalCount: invitedInternalSpeakers.length
      }
    })
  )

  speakerScores.sort((a, b) => b.count - a.count)
  speakerScores.slice(0, 5).forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.displayName} - 分數: ${item.count} (來賓講師: ${item.invitedGuestCount}, 內部講師: ${item.invitedInternalCount})`)
  })
  console.log()

  // 8. 模擬計算來賓召喚師排行榜（前5名）
  console.log('8. 來賓召喚師排行榜計算（模擬前5名）：')
  const allGuestProfilesForInvite = await prisma.guestSpeakerProfile.findMany({
    where: { invitedBy: { not: null } },
    select: { invitedBy: true }
  })

  const inviterIdsSet = new Set<string>()
  allGuestProfilesForInvite.forEach(profile => {
    if (profile.invitedBy) inviterIdsSet.add(profile.invitedBy)
  })

  const invitersForCheck = await prisma.user.findMany({
    where: { id: { in: Array.from(inviterIdsSet) } },
    select: { id: true, name: true, nickname: true }
  })

  const inviterNameMap = new Map<string, string>()
  invitersForCheck.forEach(inviter => {
    const displayName = inviter.nickname || inviter.name || '未知'
    inviterNameMap.set(inviter.id, displayName)
  })

  const inviterNameCounts = new Map<string, number>()
  allGuestProfilesForInvite.forEach(profile => {
    if (profile.invitedBy) {
      const name = inviterNameMap.get(profile.invitedBy) || '未知'
      inviterNameCounts.set(name, (inviterNameCounts.get(name) || 0) + 1)
    }
  })

  const guestInviteScores = allUsers.map(user => {
    const displayName = user.nickname || user.name || '未知'
    const count = inviterNameCounts.get(displayName) || 0
    return {
      userId: user.id,
      displayName,
      count
    }
  })

  guestInviteScores.sort((a, b) => b.count - a.count)
  guestInviteScores.slice(0, 5).forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.displayName} - 邀請次數: ${item.count}`)
  })
  console.log()

  console.log('=== 驗證完成 ===')
}

main()
  .catch((e) => {
    console.error('驗證失敗:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

