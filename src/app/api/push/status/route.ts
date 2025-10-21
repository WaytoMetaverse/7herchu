import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.email) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const user = await prisma.user.findUnique({
			where: { email: session.user.email }
		})

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 })
		}

		const subscriptions = await prisma.pushSubscription.findMany({
			where: { userId: user.id },
			select: {
				id: true,
				endpoint: true,
				isEnabled: true,
				notifyOnRegistration: true,
				notifyEventReminder: true,
				notifyNoResponse: true,
				createdAt: true
			}
		})

		const hasActiveSubscription = subscriptions.some(s => s.isEnabled)
		
		// 取第一個訂閱的偏好設定（通常用戶只有一個訂閱）
		const preferences = subscriptions[0] ? {
			notifyOnRegistration: subscriptions[0].notifyOnRegistration,
			notifyEventReminder: subscriptions[0].notifyEventReminder,
			notifyNoResponse: subscriptions[0].notifyNoResponse
		} : null

		return NextResponse.json({ 
			hasActiveSubscription,
			subscriptions,
			preferences
		})
	} catch (error) {
		console.error('Push status error:', error)
		return NextResponse.json(
			{ error: 'Failed to get status' }, 
			{ status: 500 }
		)
	}
}

