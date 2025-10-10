import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getChecklistTemplate } from '@/lib/checklistTemplates'

// 獲取活動檢核清單
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> }
) {
	const session = await getServerSession(authOptions)
	if (!session?.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const { eventId } = await params

	// 檢查活動是否存在
	const event = await prisma.event.findUnique({
		where: { id: eventId },
		select: { type: true }
	})

	if (!event) {
		return NextResponse.json({ error: 'Event not found' }, { status: 404 })
	}

	// 獲取現有的檢核清單
	let items = await prisma.eventChecklistItem.findMany({
		where: { eventId },
		orderBy: { order: 'asc' }
	})

	// 如果沒有檢核清單，則根據活動類型初始化
	if (items.length === 0) {
		const template = getChecklistTemplate(event.type)
		if (template) {
			// 批量建立檢核項目
			const createPromises = template.map((content, index) =>
				prisma.eventChecklistItem.create({
					data: {
						eventId,
						order: index + 1,
						content,
						isCompleted: false
					}
				})
			)
			items = await Promise.all(createPromises)
		}
	}

	return NextResponse.json({ items })
}

// 更新檢核項目（完成狀態或內容）
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> }
) {
	const session = await getServerSession(authOptions)
	if (!session?.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const { eventId } = await params
	const body = await request.json()
	const { itemId, isCompleted, note } = body

	if (!itemId) {
		return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
	}

	// 準備更新資料
	const updateData: {
		isCompleted?: boolean
		completedAt?: Date | null
		note?: string | null
	} = {}

	if (typeof isCompleted === 'boolean') {
		updateData.isCompleted = isCompleted
		updateData.completedAt = isCompleted ? new Date() : null
	}

	if (typeof note === 'string') {
		updateData.note = note.trim() || null
	}

	// 更新檢核項目
	const item = await prisma.eventChecklistItem.update({
		where: { id: itemId, eventId },
		data: updateData
	})

	return NextResponse.json({ item })
}

// 重置檢核清單（刪除並重新生成）
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> }
) {
	const session = await getServerSession(authOptions)
	if (!session?.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const { eventId } = await params

	// 檢查活動是否存在
	const event = await prisma.event.findUnique({
		where: { id: eventId },
		select: { type: true }
	})

	if (!event) {
		return NextResponse.json({ error: 'Event not found' }, { status: 404 })
	}

	// 刪除所有現有的檢核項目
	await prisma.eventChecklistItem.deleteMany({
		where: { eventId }
	})

	// 根據活動類型重新初始化
	const template = getChecklistTemplate(event.type)
	if (template) {
		const createPromises = template.map((content, index) =>
			prisma.eventChecklistItem.create({
				data: {
					eventId,
					order: index + 1,
					content,
					isCompleted: false
				}
			})
		)
		const items = await Promise.all(createPromises)
		return NextResponse.json({ items, message: '檢核清單已重置' })
	}

	return NextResponse.json({ items: [], message: '此活動類型無檢核清單' })
}

