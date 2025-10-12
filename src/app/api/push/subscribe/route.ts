import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
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

		const body = await request.json()
		const { subscription } = body

		if (!subscription || !subscription.endpoint || !subscription.keys) {
			return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
		}

		// 儲存或更新訂閱
		const pushSubscription = await prisma.pushSubscription.upsert({
			where: {
				userId_endpoint: {
					userId: user.id,
					endpoint: subscription.endpoint
				}
			},
			create: {
				userId: user.id,
				endpoint: subscription.endpoint,
				p256dh: subscription.keys.p256dh,
				auth: subscription.keys.auth,
				isEnabled: true
			},
			update: {
				p256dh: subscription.keys.p256dh,
				auth: subscription.keys.auth,
				isEnabled: true
			}
		})

		return NextResponse.json({ 
			success: true,
			subscription: pushSubscription
		})
	} catch (error) {
		console.error('Push subscribe error:', error)
		return NextResponse.json(
			{ error: 'Failed to subscribe' }, 
			{ status: 500 }
		)
	}
}

