import { prisma } from '@/lib/prisma'
import { sendPushNotificationToUser } from '@/lib/webpush'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { NextResponse } from 'next/server'
import { del, list, type ListBlobResult } from '@vercel/blob'

/**
 * Vercel Cron Job: 每週一凌晨 2:00 執行
 * 1. 發送明天（週二）活動的提醒推播
 * 2. 清除 3 個月前的上傳檔案
 */
export async function GET() {
	const results = {
		eventReminders: { ok: false, events: 0, sent: 0, error: null as string | null },
		cleanup: { ok: false, removed: 0, error: null as string | null }
	}

	// ========== 1. 發送活動提醒 ==========
	try {
		// 取得明天的日期範圍（00:00 ~ 23:59）
		const now = new Date()
		const tomorrow = new Date(now)
		tomorrow.setDate(tomorrow.getDate() + 1)
		const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0)
		const tomorrowEnd = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59)

		// 查詢明天有哪些活動
		const tomorrowEvents = await prisma.event.findMany({
			where: {
				startAt: {
					gte: tomorrowStart,
					lte: tomorrowEnd
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
			}
		})

		console.log(`[Weekly Cron] 明天有 ${tomorrowEvents.length} 個活動`)

		let totalSent = 0

		// 為每個活動發送提醒
		for (const event of tomorrowEvents) {
			if (event.registrations.length === 0) {
				console.log(`[Weekly Cron] 活動 ${event.title} 沒有已報名成員，跳過`)
				continue
			}

			const timeLabel = format(event.startAt, 'HH:mm', { locale: zhTW })
			const locationText = event.location ? ` @ ${event.location}` : ''

			// 只發送給已報名且未請假的內部成員（過濾掉沒有 userId 的記錄）
			const registeredMembers = event.registrations.filter(reg => reg.userId !== null)
			
			if (registeredMembers.length === 0) {
				console.log(`[Weekly Cron] 活動 ${event.title} 沒有有效的已報名成員，跳過`)
				continue
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
					userId: true
				}
			})

			const enabledUserIds = new Set(usersWithReminderEnabled.map(sub => sub.userId))
			const membersToNotify = registeredMembers.filter(reg => enabledUserIds.has(reg.userId!))

			if (membersToNotify.length === 0) {
				console.log(`[Weekly Cron] 活動 ${event.title} 沒有啟用活動提醒的已報名成員，跳過`)
				continue
			}

			// 逐個發送推播通知給已報名且啟用提醒的成員
			const notificationPayload = {
				title: `⏰ 明日活動提醒`,
				body: `${event.title} | ${timeLabel}${locationText}`,
				icon: '/logo.jpg',
				badge: '/logo.jpg',
				data: {
					url: `/hall/${event.id}`,
					eventId: event.id,
					type: 'event_reminder'
				}
			}

			const notificationResults = await Promise.allSettled(
				membersToNotify.map(reg => 
					sendPushNotificationToUser(reg.userId!, notificationPayload)
				)
			)

			const successCount = notificationResults.filter(r => r.status === 'fulfilled').length
			totalSent += successCount
			console.log(`[Weekly Cron] 已發送提醒給活動 ${event.title} 的 ${successCount}/${membersToNotify.length} 位已報名且啟用提醒的成員`)
		}

		results.eventReminders = {
			ok: true,
			events: tomorrowEvents.length,
			sent: totalSent,
			error: null
		}
	} catch (error) {
		console.error('[Weekly Cron] 發送活動提醒失敗:', error)
		results.eventReminders.error = (error as Error).message
	}

	// ========== 2. 清除舊檔案 ==========
	try {
		if (!process.env.BLOB_READ_WRITE_TOKEN) {
			results.cleanup = { ok: true, removed: 0, error: 'no blob token' }
		} else {
			// 取得「當月月初往前推 3 個整月」的時間點
			const now = new Date()
			const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
			const cutoffDate = new Date(firstOfThisMonth)
			cutoffDate.setMonth(cutoffDate.getMonth() - 3)
			const cutoff = cutoffDate.getTime()
			const prefix = 'uploads/'
			let removed = 0
			let cursor: string | undefined = undefined
			
			do {
				const res: ListBlobResult = await list({ token: process.env.BLOB_READ_WRITE_TOKEN, prefix, cursor })
				for (const item of res.blobs) {
					const uploadedAt = new Date(item.uploadedAt).getTime()
					if (uploadedAt && uploadedAt < cutoff) {
						await del(item.url, { token: process.env.BLOB_READ_WRITE_TOKEN })
						removed += 1
					}
				}
				cursor = res.cursor
			} while (cursor)

			results.cleanup = {
				ok: true,
				removed,
				error: null
			}
			console.log(`[Weekly Cron] 已清除 ${removed} 個舊檔案`)
		}
	} catch (error) {
		console.error('[Weekly Cron] 清除舊檔案失敗:', error)
		results.cleanup.error = (error as Error).message
	}

	return NextResponse.json({
		ok: results.eventReminders.ok && results.cleanup.ok,
		results
	})
}

