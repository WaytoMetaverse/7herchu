import { prisma } from './prisma'
import { sendPushNotificationToAll } from './webpush'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { getDisplayName as getDisplayNameUtil } from './displayName'

/**
 * 發送報名通知給所有用戶
 */
export async function sendRegistrationNotification(eventId: string, registrantName: string, role: 'SPEAKER' | 'MEMBER' | 'GUEST') {
	try {
		// 獲取活動資訊
		const event = await prisma.event.findUnique({
			where: { id: eventId },
			include: {
				registrations: {
					where: { status: 'REGISTERED' }
				},
				speakerBookings: true
			}
		})

		if (!event) {
			console.error('[Notification] 活動不存在:', eventId)
			return
		}

		// 統計人數
		const speakers = event.speakerBookings.length
		const members = event.registrations.filter(r => r.role === 'MEMBER').length
		const guests = event.registrations.filter(r => r.role === 'GUEST').length
		const total = speakers + members + guests

		// 格式化時間
		const dateLabel = format(event.startAt, 'MM/dd（EEEEE）HH:mm - ', { locale: zhTW })
		const endTime = format(event.endAt, 'HH:mm', { locale: zhTW })
		
		// 角色中文名稱
		const roleLabel = {
			SPEAKER: '講師',
			MEMBER: '內部成員',
			GUEST: '來賓'
		}[role]

		// 組合通知內容
		const title = `🌟${registrantName} 報名了 ${dateLabel}${endTime} ${event.title}🌟`
		const body = `講師:${speakers}位、內部成員:${members}位、來賓${guests}位，共${total}位`

		// 發送推送通知
		await sendPushNotificationToAll({
			title,
			body,
			icon: '/logo.jpg',
			badge: '/logo.jpg',
			data: {
				url: `/hall/${eventId}`,
				eventId,
				type: 'registration'
			}
		})

		console.log(`[Notification] 已發送報名通知: ${registrantName} (${roleLabel})`)
	} catch (error) {
		console.error('[Notification] 發送報名通知失敗:', error)
		// 不拋出錯誤，避免影響報名流程
	}
}

/**
 * 獲取顯示名稱（使用暱稱或姓名後兩字）
 */
export function getDisplayName(user: { name: string | null; nickname?: string | null } | null, fallbackName?: string | null): string {
	if (!user && !fallbackName) return '未命名'
	
	if (user) {
		return getDisplayNameUtil(user) || fallbackName || '未命名'
	}
	
	if (fallbackName) {
		// 如果只有名字，取後兩字
		return fallbackName.length >= 2 ? fallbackName.slice(-2) : fallbackName
	}
	
	return '未命名'
}

