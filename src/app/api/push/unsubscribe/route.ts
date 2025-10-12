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
		const { endpoint } = body

		if (endpoint) {
			// 取消特定裝置的訂閱
			await prisma.pushSubscription.updateMany({
				where: {
					userId: user.id,
					endpoint
				},
				data: {
					isEnabled: false
				}
			})
		} else {
			// 取消所有訂閱
			await prisma.pushSubscription.updateMany({
				where: {
					userId: user.id
				},
				data: {
					isEnabled: false
				}
			})
		}

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error('Push unsubscribe error:', error)
		return NextResponse.json(
			{ error: 'Failed to unsubscribe' }, 
			{ status: 500 }
		)
	}
}

