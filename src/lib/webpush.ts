import webpush from 'web-push'
import { prisma } from './prisma'

// 設定 VAPID 詳細資訊
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT

if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
	webpush.setVapidDetails(
		vapidSubject,
		vapidPublicKey,
		vapidPrivateKey
	)
	console.log('[WebPush] VAPID 已設定')
} else {
	console.warn('[WebPush] VAPID 環境變數未完整設定')
	console.warn('- NEXT_PUBLIC_VAPID_PUBLIC_KEY:', !!vapidPublicKey)
	console.warn('- VAPID_PRIVATE_KEY:', !!vapidPrivateKey)
	console.warn('- VAPID_SUBJECT:', !!vapidSubject)
}

export interface PushNotificationPayload {
	title: string
	body: string
	icon?: string
	badge?: string
	data?: {
		url?: string
		[key: string]: unknown
	}
}

/**
 * 發送推送通知給所有啟用通知的用戶
 * @param payload 通知內容
 * @param notificationType 通知類型：'registration' | 'event_reminder' | 'no_response' | 'announcement'
 */
export async function sendPushNotificationToAll(payload: PushNotificationPayload, notificationType?: 'registration' | 'event_reminder' | 'no_response' | 'announcement') {
	try {
		// 根據通知類型過濾訂閱
		const whereClause: {
			isEnabled: boolean
			notifyOnRegistration?: boolean
			notifyEventReminder?: boolean
			notifyNoResponse?: boolean
			notifyAnnouncement?: boolean
		} = { isEnabled: true }
		
		if (notificationType === 'registration') {
			whereClause.notifyOnRegistration = true
		} else if (notificationType === 'event_reminder') {
			whereClause.notifyEventReminder = true
		} else if (notificationType === 'no_response') {
			whereClause.notifyNoResponse = true
		} else if (notificationType === 'announcement') {
			whereClause.notifyAnnouncement = true
		}
		
		// 獲取所有啟用推送通知的訂閱
		const subscriptions = await prisma.pushSubscription.findMany({
			where: whereClause,
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true
					}
				}
			}
		})

		console.log(`[WebPush] 發送通知給 ${subscriptions.length} 個訂閱`)

		const results = await Promise.allSettled(
			subscriptions.map(async (sub) => {
				try {
					const pushSubscription = {
						endpoint: sub.endpoint,
						keys: {
							p256dh: sub.p256dh,
							auth: sub.auth
						}
					}

					await webpush.sendNotification(
						pushSubscription,
						JSON.stringify(payload)
					)

					console.log(`[WebPush] 成功發送給用戶 ${sub.user.name || sub.user.email}`)
					return { success: true, userId: sub.userId }
				} catch (error) {
					console.error(`[WebPush] 發送失敗給用戶 ${sub.user.name || sub.user.email}:`, error)
					
					// 如果訂閱已過期（410 Gone），刪除該訂閱
					if (error instanceof Error && 'statusCode' in error && error.statusCode === 410) {
						console.log(`[WebPush] 刪除過期訂閱: ${sub.id}`)
						await prisma.pushSubscription.delete({
							where: { id: sub.id }
						})
					}
					
					return { success: false, userId: sub.userId, error }
				}
			})
		)

		const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
		console.log(`[WebPush] 完成：成功 ${successCount}/${subscriptions.length}`)

		return {
			total: subscriptions.length,
			success: successCount,
			failed: subscriptions.length - successCount
		}
	} catch (error) {
		console.error('[WebPush] 發送通知失敗:', error)
		throw error
	}
}

/**
 * 發送推送通知給特定用戶
 */
export async function sendPushNotificationToUser(userId: string, payload: PushNotificationPayload) {
	try {
		const subscriptions = await prisma.pushSubscription.findMany({
			where: { 
				userId,
				isEnabled: true 
			}
		})

		if (subscriptions.length === 0) {
			console.log(`[WebPush] 用戶 ${userId} 沒有啟用的訂閱`)
			return { total: 0, success: 0, failed: 0 }
		}

		const results = await Promise.allSettled(
			subscriptions.map(async (sub) => {
				try {
					const pushSubscription = {
						endpoint: sub.endpoint,
						keys: {
							p256dh: sub.p256dh,
							auth: sub.auth
						}
					}

					await webpush.sendNotification(
						pushSubscription,
						JSON.stringify(payload)
					)

					return { success: true }
				} catch (error) {
					console.error(`[WebPush] 發送失敗:`, error)
					
					if (error instanceof Error && 'statusCode' in error && error.statusCode === 410) {
						await prisma.pushSubscription.delete({
							where: { id: sub.id }
						})
					}
					
					return { success: false, error }
				}
			})
		)

		const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length

		return {
			total: subscriptions.length,
			success: successCount,
			failed: subscriptions.length - successCount
		}
	} catch (error) {
		console.error('[WebPush] 發送通知給用戶失敗:', error)
		throw error
	}
}

