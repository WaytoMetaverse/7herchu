import { prisma } from '@/lib/prisma'
import { sendPushNotificationToAll } from '@/lib/webpush'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { NextResponse } from 'next/server'

/**
 * Vercel Cron Job: 每天早上 10:00 發送活動提醒
 * 提醒已報名用戶當天有活動
 */
export async function GET() {
	try {
		// 取得今天的日期範圍（00:00 ~ 23:59）
		const now = new Date()
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
		const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

		// 查詢今天有哪些活動
		const todayEvents = await prisma.event.findMany({
			where: {
				startAt: {
					gte: todayStart,
					lte: todayEnd
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

		console.log(`[Cron] 今天有 ${todayEvents.length} 個活動`)

		// 為每個活動發送提醒
		for (const event of todayEvents) {
			if (event.registrations.length === 0) {
				console.log(`[Cron] 活動 ${event.title} 沒有已報名成員，跳過`)
				continue
			}

			const timeLabel = format(event.startAt, 'HH:mm', { locale: zhTW })
			const locationText = event.location ? ` @ ${event.location}` : ''

			// 發送推播通知給已報名的成員
			await sendPushNotificationToAll({
				title: `⏰ 今日活動提醒`,
				body: `${event.title} | ${timeLabel}${locationText}`,
				icon: '/logo.jpg',
				badge: '/logo.jpg',
				data: {
					url: `/hall/${event.id}`,
					eventId: event.id,
					type: 'event_reminder'
				}
			}, 'event_reminder')

			console.log(`[Cron] 已發送提醒給活動 ${event.title} 的 ${event.registrations.length} 位成員`)
		}

		return NextResponse.json({ 
			ok: true, 
			message: `處理了 ${todayEvents.length} 個活動`,
			events: todayEvents.map(e => ({
				id: e.id,
				title: e.title,
				startAt: e.startAt,
				registrations: e.registrations.length
			}))
		})

	} catch (error) {
		console.error('[Cron] 發送活動提醒失敗:', error)
		return NextResponse.json(
			{ error: 'Failed to send event reminders', details: (error as Error).message }, 
			{ status: 500 }
		)
	}
}

