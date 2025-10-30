import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest) {
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

		const body = await req.json()
		const { notifyOnRegistration, notifyEventReminder, notifyNoResponse, notifyAnnouncement } = body

		// 更新所有該用戶的訂閱偏好
		await prisma.pushSubscription.updateMany({
			where: { userId: user.id },
			data: {
				...(notifyOnRegistration !== undefined && { notifyOnRegistration }),
				...(notifyEventReminder !== undefined && { notifyEventReminder }),
				...(notifyNoResponse !== undefined && { notifyNoResponse }),
				...(notifyAnnouncement !== undefined && { notifyAnnouncement })
			}
		})

		return NextResponse.json({ ok: true })
	} catch (error) {
		console.error('Update preferences error:', error)
		return NextResponse.json(
			{ error: 'Failed to update preferences' }, 
			{ status: 500 }
		)
	}
}

