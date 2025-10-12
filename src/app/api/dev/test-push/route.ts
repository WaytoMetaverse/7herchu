import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { sendPushNotificationToAll } from '@/lib/webpush'

// 測試推送通知（開發測試用，移除權限檢查）
export async function GET() {
	try {

		// 檢查訂閱數量
		const subscriptions = await prisma.pushSubscription.findMany({
			where: { isEnabled: true },
			include: {
				user: {
					select: { name: true, email: true }
				}
			}
		})

		console.log('訂閱總數:', subscriptions.length)
		subscriptions.forEach(sub => {
			console.log('- 用戶:', sub.user.name || sub.user.email)
		})

		// 發送測試通知
		const result = await sendPushNotificationToAll({
			title: '🧪 測試通知',
			body: '這是一則測試推送通知，如果您看到這則訊息，表示推送功能正常運作！',
			icon: '/logo.jpg',
			badge: '/logo.jpg',
			data: {
				url: '/hall'
			}
		})

		return NextResponse.json({
			success: true,
			subscriptions: subscriptions.length,
			result
		})
	} catch (error) {
		console.error('Test push error:', error)
		return NextResponse.json(
			{ error: 'Failed to send test notification', details: String(error) },
			{ status: 500 }
		)
	}
}

