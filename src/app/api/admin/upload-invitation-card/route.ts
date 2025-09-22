import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'
import fs from 'node:fs/promises'
import path from 'node:path'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
	try {
		// 檢查權限
		const session = await getServerSession(authOptions)
		const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
		const isAdmin = roles.includes('admin')
		if (!isAdmin) {
			return NextResponse.json({ error: '權限不足' }, { status: 403 })
		}

		const formData = await request.formData()
		const file = formData.get('file') as File
		const cardType = formData.get('cardType') as string

		if (!file || file.size === 0 || !cardType) {
			return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
		}

		// 檢查檔案類型
		if (!file.type.startsWith('image/')) {
			return NextResponse.json({ error: '僅支援圖片檔案' }, { status: 400 })
		}

		// 處理檔案上傳
		const buf = Buffer.from(await file.arrayBuffer())
		const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
		const filename = `invitation_${cardType}_${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`
		
		let uploadUrl: string

		if (process.env.BLOB_READ_WRITE_TOKEN) {
			// 使用 Vercel Blob
			const res = await put(`uploads/${filename}`, buf, {
				access: 'public',
				addRandomSuffix: false,
				token: process.env.BLOB_READ_WRITE_TOKEN,
				contentType: file.type || 'image/jpeg',
			})
			uploadUrl = res.url
		} else {
			// 使用本地檔案系統
			const uploadDir = path.join(process.cwd(), 'public', 'uploads')
			await fs.mkdir(uploadDir, { recursive: true })
			await fs.writeFile(path.join(uploadDir, filename), buf)
			uploadUrl = `/uploads/${filename}`
		}

		if (!uploadUrl) {
			return NextResponse.json({ error: '上傳失敗' }, { status: 500 })
		}

		// 根據卡片類型更新不同欄位
		const updateField = {
			general: 'invitationCardGeneral',
			dinner: 'invitationCardDinner',
			soft: 'invitationCardSoft',
			bod: 'invitationCardBod',
			speaker: 'invitationCardSpeaker',
			visit: 'invitationCardVisit'
		}[cardType]
		
		if (!updateField) {
			return NextResponse.json({ error: '無效的卡片類型' }, { status: 400 })
		}

		// 更新組織設定
		await prisma.orgSettings.upsert({
			where: { id: 'singleton' },
			create: {
				id: 'singleton',
				bankInfo: '',
				[updateField]: uploadUrl
			},
			update: {
				[updateField]: uploadUrl
			}
		})

		// 清除相關頁面的快取
		revalidatePath('/admin/invitation-cards')
		revalidatePath('/admin/invitations')
		// 清除所有活動相關頁面的快取，因為邀請卡會影響活動邀請頁面
		revalidatePath('/events', 'layout')

		return NextResponse.json({ 
			success: true, 
			url: uploadUrl,
			message: '上傳成功'
		})

	} catch (error) {
		console.error('Upload invitation card error:', error)
		return NextResponse.json({ error: '上傳失敗' }, { status: 500 })
	}
}
