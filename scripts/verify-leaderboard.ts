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

  // 7. 模擬計算講師大師排行榜（前5名）- 新邏輯：直接統計 invitedBy 出現次數
  console.log('7. 講師大師排行榜計算（新邏輯，前5名）：')
  
  // 1. 從來賓庫取得所有講師的 invitedBy
  const guestSpeakersForLeaderboard = await prisma.guestSpeakerProfile.findMany({
    where: { 
      role: 'SPEAKER',
      invitedBy: { not: null }
    },
    select: { invitedBy: true }
  })

  // 2. 從 Registration 取得內部成員升講師的 invitedBy
  const internalSpeakersForLeaderboard = await prisma.registration.findMany({
    where: {
      role: 'SPEAKER',
      userId: { not: null },
      status: 'REGISTERED',
      invitedBy: { not: null }
    },
    select: { invitedBy: true }
  })

  // 3. 統計每個邀請人名字的出現次數
  const speakerInviterCounts = new Map<string, number>()
  guestSpeakersForLeaderboard.forEach(speaker => {
    if (speaker.invitedBy) {
      speakerInviterCounts.set(speaker.invitedBy, (speakerInviterCounts.get(speaker.invitedBy) || 0) + 1)
    }
  })
  internalSpeakersForLeaderboard.forEach(reg => {
    if (reg.invitedBy) {
      speakerInviterCounts.set(reg.invitedBy, (speakerInviterCounts.get(reg.invitedBy) || 0) + 1)
    }
  })
  
  // 直接按名字和次數排名
  const speakerLeaderboard = Array.from(speakerInviterCounts.entries())
    .map(([name, count]) => ({
      displayName: name,
      count
    }))
    .sort((a, b) => b.count - a.count)

  console.log(`   - 來賓庫講師數（有 invitedBy）：${guestSpeakersForLeaderboard.length}`)
  console.log(`   - 內部講師數（有 invitedBy）：${internalSpeakersForLeaderboard.length}`)
  console.log(`   - 不重複邀請人數：${speakerInviterCounts.size}`)
  speakerLeaderboard.slice(0, 5).forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.displayName} - 邀請次數: ${item.count}`)
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

