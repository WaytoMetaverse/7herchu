import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { sendPushNotificationToAll } from '@/lib/webpush'

/**
 * 發送公告推播通知
 * 只有管理員可以發送
 */
export async function POST(req: NextRequest) {
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

		// 檢查是否為管理員
		const roles = ((user as { roles?: string[] }).roles) ?? []
		if (!roles.includes('admin')) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		}

		const body = await req.json()
		const { title, body: bodyText } = body

		if (!title || !bodyText) {
			return NextResponse.json(
				{ error: '標題和內容都是必填的' },
				{ status: 400 }
			)
		}

		// 發送推播通知給所有啟用公告通知的用戶
		const result = await sendPushNotificationToAll({
			title,
			body: bodyText,
			icon: '/logo.jpg',
			badge: '/logo.jpg',
			data: {
				url: '/hall',
				type: 'announcement'
			}
		}, 'announcement')

		// 記錄到資料庫
		const announcement = await prisma.announcement.create({
			data: {
				title,
				body: bodyText,
				sentBy: user.id,
				sentCount: result.success,
				totalCount: result.total
			}
		})

		return NextResponse.json({
			ok: true,
			announcement: {
				id: announcement.id,
				title: announcement.title,
				body: announcement.body,
				sentCount: announcement.sentCount,
				totalCount: announcement.totalCount,
				createdAt: announcement.createdAt
			},
			result
		})
	} catch (error) {
		console.error('[Announcement] 發送失敗:', error)
		return NextResponse.json(
			{ error: 'Failed to send announcement', details: (error as Error).message },
			{ status: 500 }
		)
	}
}
