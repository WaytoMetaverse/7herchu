import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

/**
 * 測試活動提醒查詢邏輯（不發送通知）
 * GET /api/dev/test-event-reminder?date=2025-01-14 (可選，預設為今天)
 */
export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url)
		const dateParam = searchParams.get('date') // 格式: YYYY-MM-DD
		
		// 使用台灣時區（UTC+8）計算日期範圍
		const taiwanOffsetMs = 8 * 60 * 60 * 1000 // UTC+8
		
		let targetDate: Date
		if (dateParam) {
			// 使用指定的日期
			const [year, month, day] = dateParam.split('-').map(v => parseInt(v, 10))
			targetDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0)) // 中午12點作為基準
		} else {
			// 使用今天
			const now = new Date()
			const taiwanNowMs = now.getTime() + taiwanOffsetMs
			targetDate = new Date(taiwanNowMs)
		}
		
		// 台灣時間的目標日期（年、月、日）
		const taiwanYear = targetDate.getUTCFullYear()
		const taiwanMonth = targetDate.getUTCMonth()
		const taiwanDate = targetDate.getUTCDate()
		
		// 台灣時間的 00:00:00 和 23:59:59（作為 UTC 查詢）
		const dayStartUTC = new Date(Date.UTC(taiwanYear, taiwanMonth, taiwanDate, 0, 0, 0, 0))
		const dayEndUTC = new Date(Date.UTC(taiwanYear, taiwanMonth, taiwanDate, 23, 59, 59, 999))

		console.log(`[Test] 查詢台灣時間 ${taiwanYear}-${String(taiwanMonth + 1).padStart(2, '0')}-${String(taiwanDate).padStart(2, '0')} 的活動`)
		console.log(`[Test] UTC 查詢範圍: ${dayStartUTC.toISOString()} ~ ${dayEndUTC.toISOString()}`)

		// 查詢該日期的活動
		const events = await prisma.event.findMany({
			where: {
				startAt: {
					gte: dayStartUTC,
					lte: dayEndUTC
				}
			},
			include: {
				registrations: {
					where: {
						status: 'REGISTERED',
						role: 'MEMBER'
					},
					include: {
						user: {
							select: {
								id: true,
								name: true,
								nickname: true
							}
						}
					}
				}
			},
			orderBy: {
				startAt: 'asc'
			}
		})

		// 檢查每個活動的提醒發送情況
		const eventDetails = await Promise.all(
			events.map(async (event) => {
				const registeredMembers = event.registrations.filter(reg => reg.userId !== null)
				
				if (registeredMembers.length === 0) {
					return {
						eventId: event.id,
						title: event.title,
						startAt: event.startAt.toISOString(),
						registeredCount: 0,
						reminderEnabledCount: 0,
						members: []
					}
				}

				// 檢查哪些用戶有啟用活動提醒通知偏好
				const userIds = registeredMembers.map(reg => reg.userId!).filter(Boolean)
				const usersWithReminderEnabled = await prisma.pushSubscription.findMany({
					where: {
						userId: { in: userIds },
						isEnabled: true,
						notifyEventReminder: true
					},
					select: {
						userId: true,
						user: {
							select: {
								name: true,
								nickname: true
							}
						}
					}
				})

				const enabledUserIds = new Set(usersWithReminderEnabled.map(sub => sub.userId))
				const membersToNotify = registeredMembers.filter(reg => enabledUserIds.has(reg.userId!))

				return {
					eventId: event.id,
					title: event.title,
					startAt: event.startAt.toISOString(),
					registeredCount: registeredMembers.length,
					reminderEnabledCount: membersToNotify.length,
					members: membersToNotify.map(reg => ({
						userId: reg.userId,
						name: reg.user?.name || reg.user?.nickname || '未知',
						hasReminderEnabled: true
					}))
				}
			})
		)

		return NextResponse.json({
			success: true,
			targetDate: `${taiwanYear}-${String(taiwanMonth + 1).padStart(2, '0')}-${String(taiwanDate).padStart(2, '0')}`,
			queryRange: {
				start: dayStartUTC.toISOString(),
				end: dayEndUTC.toISOString()
			},
			eventsFound: events.length,
			events: eventDetails,
			totalReminders: eventDetails.reduce((sum, e) => sum + e.reminderEnabledCount, 0)
		})
	} catch (error) {
		console.error('[Test] 測試活動提醒查詢失敗:', error)
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		)
	}
}

