/**
 * 初始化來賓/講師歷史資料腳本
 * 執行方式：npx tsx scripts/init-speakers-guests.ts
 */

import { PrismaClient, GuestType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
	console.log('開始初始化來賓/講師歷史資料...')

	// 取得所有已結束的活動
	const now = new Date()
	const pastEvents = await prisma.event.findMany({
		where: {
			endAt: { lt: now }
		},
		include: {
			speakerBookings: true,
			registrations: {
				where: {
					OR: [
						{ role: 'GUEST' },
						{ role: 'SPEAKER', userId: null } // 來賓升為講師
					]
				}
			}
		}
	})

	console.log(`找到 ${pastEvents.length} 個已結束的活動`)

	const profileMap = new Map<string, {
		name: string
		phone: string
		companyName?: string
		industry?: string
		guestType?: GuestType
		bniChapter?: string
		invitedBy?: string
		role: 'GUEST' | 'SPEAKER'
		lastEventDate: Date
	}>()

	// 處理講師預約（SpeakerBooking）
	for (const event of pastEvents) {
		for (const speaker of event.speakerBookings) {
			const key = `${speaker.phone}_${speaker.name}`
			const existing = profileMap.get(key)
			
			// 判斷 guestType（歷史資料：如果有 bniChapter 則為 OTHER_BNI，否則為 NON_BNI）
			const guestType: GuestType = speaker.guestType || (speaker.bniChapter ? 'OTHER_BNI' : 'NON_BNI')
			
			if (!existing || event.startAt > existing.lastEventDate) {
				profileMap.set(key, {
					name: speaker.name,
					phone: speaker.phone,
					companyName: speaker.companyName || undefined,
					industry: speaker.industry || undefined,
					guestType,
					bniChapter: speaker.bniChapter || undefined,
					invitedBy: speaker.invitedBy || undefined,
					role: 'SPEAKER',
					lastEventDate: event.startAt
				})
			} else if (existing.role === 'GUEST' && event.startAt > existing.lastEventDate) {
				// 如果原本是來賓，但這次是講師，優先顯示講師
				profileMap.set(key, {
					...existing,
					role: 'SPEAKER',
					lastEventDate: event.startAt,
					guestType: guestType || existing.guestType,
					bniChapter: speaker.bniChapter || existing.bniChapter,
					companyName: speaker.companyName || existing.companyName,
					industry: speaker.industry || existing.industry,
					invitedBy: speaker.invitedBy || existing.invitedBy
				})
			}
		}
	}

	// 處理來賓報名（Registration）
	for (const event of pastEvents) {
		for (const reg of event.registrations) {
			if (!reg.phone || !reg.name) continue
			
			const key = `${reg.phone}_${reg.name}`
			const existing = profileMap.get(key)
			
			if (!existing) {
				// 新資料
				profileMap.set(key, {
					name: reg.name,
					phone: reg.phone,
					companyName: reg.companyName || undefined,
					industry: reg.industry || undefined,
					guestType: reg.guestType || undefined,
					bniChapter: reg.bniChapter || undefined,
					invitedBy: reg.invitedBy || undefined,
					role: reg.role === 'SPEAKER' ? 'SPEAKER' : 'GUEST',
					lastEventDate: event.startAt
				})
			} else if (event.startAt > existing.lastEventDate) {
				// 如果新活動日期更晚，更新資料
				if (existing.role === 'GUEST' && reg.role === 'SPEAKER') {
					// 如果原本是來賓，但這次是講師，優先顯示講師
					profileMap.set(key, {
						...existing,
						role: 'SPEAKER',
						lastEventDate: event.startAt,
						guestType: reg.guestType || existing.guestType,
						bniChapter: reg.bniChapter || existing.bniChapter,
						companyName: reg.companyName || existing.companyName,
						industry: reg.industry || existing.industry,
						invitedBy: reg.invitedBy || existing.invitedBy
					})
				} else {
					// 更新 lastEventDate 和其他資料
					profileMap.set(key, {
						...existing,
						lastEventDate: event.startAt,
						companyName: reg.companyName || existing.companyName,
						industry: reg.industry || existing.industry,
						guestType: reg.guestType || existing.guestType,
						bniChapter: reg.bniChapter || existing.bniChapter,
						invitedBy: reg.invitedBy || existing.invitedBy
					})
				}
			}
		}
	}

	console.log(`整理出 ${profileMap.size} 筆去重後的資料`)

	// 批次建立或更新資料
	const profiles = Array.from(profileMap.values())
	let created = 0
	let updated = 0

	for (const p of profiles) {
		try {
			// 檢查是否已存在
			const existing = await prisma.guestSpeakerProfile.findUnique({
				where: {
					phone_name: {
						phone: p.phone,
						name: p.name
					}
				}
			})

			if (existing) {
				// 更新：如果新活動日期更晚，更新 lastEventDate；如果新角色是講師，更新 role
				await prisma.guestSpeakerProfile.update({
					where: {
						phone_name: {
							phone: p.phone,
							name: p.name
						}
					},
					data: {
						lastEventDate: p.lastEventDate > existing.lastEventDate ? p.lastEventDate : existing.lastEventDate,
						role: p.role === 'SPEAKER' ? 'SPEAKER' : existing.role,
						companyName: p.companyName || existing.companyName,
						industry: p.industry || existing.industry,
						guestType: p.guestType || existing.guestType,
						bniChapter: p.bniChapter || existing.bniChapter,
						invitedBy: p.invitedBy || existing.invitedBy
					}
				})
				updated++
			} else {
				// 建立新資料
				await prisma.guestSpeakerProfile.create({
					data: {
						name: p.name,
						phone: p.phone,
						companyName: p.companyName,
						industry: p.industry,
						guestType: p.guestType,
						bniChapter: p.bniChapter,
						invitedBy: p.invitedBy,
						role: p.role,
						lastEventDate: p.lastEventDate
					}
				})
				created++
			}
		} catch (error) {
			console.error(`處理 ${p.name} (${p.phone}) 時發生錯誤:`, error)
		}
	}

	console.log(`初始化完成：新增 ${created} 筆，更新 ${updated} 筆`)
}

main()
	.catch((e) => {
		console.error('執行失敗:', e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})

