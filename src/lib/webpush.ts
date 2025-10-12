import webpush from 'web-push'
import { prisma } from './prisma'

// 設定 VAPID 詳細資訊
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
	webpush.setVapidDetails(
		process.env.VAPID_SUBJECT,
		process.env.VAPID_PUBLIC_KEY,
		process.env.VAPID_PRIVATE_KEY
	)
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
 */
export async function sendPushNotificationToAll(payload: PushNotificationPayload) {
	try {
		// 獲取所有啟用推送通知的訂閱
		const subscriptions = await prisma.pushSubscription.findMany({
			where: { isEnabled: true },
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

