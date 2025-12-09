import { prisma } from '@/lib/prisma'
import { sendPushNotificationToUser } from '@/lib/webpush'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { NextResponse } from 'next/server'
import { del, list, type ListBlobResult } from '@vercel/blob'

/**
 * Vercel Cron Job: 每週二凌晨 2:00 UTC 執行（台灣時間週二早上 10:00）
 * 1. 發送當日（週二）活動的提醒推播
 * 2. 清除 3 個月前的上傳檔案
 */
export async function GET() {
	const results = {
		eventReminders: { ok: false, events: 0, sent: 0, error: null as string | null },
		cleanup: { ok: false, removed: 0, error: null as string | null }
	}

	// ========== 1. 發送活動提醒 ==========
	try {
		// 使用台灣時區（UTC+8）計算今天的日期範圍
		// 活動在資料庫中存儲時，buildDate 創建的 Date 在 UTC 伺服器上會被解釋為 UTC 時間
		// 但用戶輸入的是台灣時間，所以存儲的 UTC 時間 = 台灣時間（沒有轉換）
		// 因此查詢時，需要將台灣時間的日期範圍直接作為 UTC 查詢
		const now = new Date()
		const taiwanOffsetMs = 8 * 60 * 60 * 1000 // UTC+8
		
		// 取得台灣時間的當前時間戳
		const taiwanNowMs = now.getTime() + taiwanOffsetMs
		const taiwanNow = new Date(taiwanNowMs)
		
		// 台灣時間的今天（年、月、日）
		const taiwanYear = taiwanNow.getUTCFullYear()
		const taiwanMonth = taiwanNow.getUTCMonth()
		const taiwanDate = taiwanNow.getUTCDate()
		
		// 由於活動存儲時沒有時區轉換，直接使用台灣時間作為 UTC 查詢
		// 台灣時間今天的 00:00:00（作為 UTC 查詢）
		const todayStartUTC = new Date(Date.UTC(taiwanYear, taiwanMonth, taiwanDate, 0, 0, 0, 0))
		
		// 台灣時間今天的 23:59:59（作為 UTC 查詢）
		const todayEndUTC = new Date(Date.UTC(taiwanYear, taiwanMonth, taiwanDate, 23, 59, 59, 999))

		console.log(`[Weekly Cron] 查詢台灣時間 ${taiwanYear}-${String(taiwanMonth + 1).padStart(2, '0')}-${String(taiwanDate).padStart(2, '0')} 的活動`)
		console.log(`[Weekly Cron] UTC 查詢範圍: ${todayStartUTC.toISOString()} ~ ${todayEndUTC.toISOString()}`)

		// 查詢今天有哪些活動
		const todayEvents = await prisma.event.findMany({
			where: {
				startAt: {
					gte: todayStartUTC,
					lte: todayEndUTC
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

		console.log(`[Weekly Cron] 今天有 ${todayEvents.length} 個活動`)

		let totalSent = 0

		// 為每個活動發送提醒
		for (const event of todayEvents) {
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
				title: `⏰ 今日活動提醒`,
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
			events: todayEvents.length,
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

