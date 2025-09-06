import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { Role } from '@prisma/client'

export async function POST(request: NextRequest) {
	try {
		// 檢查權限
		const session = await getServerSession(authOptions)
		if (!session?.user) {
			return NextResponse.json({ error: '未登入' }, { status: 401 })
		}

		const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles) ?? []
		const isAdmin = roles.includes('admin' as Role)
		
		if (!isAdmin) {
			return NextResponse.json({ error: '權限不足' }, { status: 403 })
		}

		const formData = await request.formData()
		const file = formData.get('file') as File
		const imageType = formData.get('imageType') as 'mobile' | 'desktop'

		if (!file || !imageType) {
			return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
		}

		// 檢查檔案類型
		if (!file.type.startsWith('image/')) {
			return NextResponse.json({ error: '請上傳圖片檔案' }, { status: 400 })
		}

		// 檢查檔案大小 (2MB)
		if (file.size > 2 * 1024 * 1024) {
			return NextResponse.json({ error: '檔案過大，請小於 2MB' }, { status: 400 })
		}

		// 獲取組織設定
		let orgSettings = await prisma.orgSettings.findFirst()
		if (!orgSettings) {
			// 如果不存在，創建預設設定
			orgSettings = await prisma.orgSettings.create({
				data: {
					bankInfo: '',
					mobileGalleryImages: [],
					desktopGalleryImages: []
				}
			})
		}

		// 檢查圖片數量限制
		const currentImages = imageType === 'mobile' 
			? orgSettings.mobileGalleryImages 
			: orgSettings.desktopGalleryImages
		
		if (currentImages.length >= 8) {
			return NextResponse.json({ error: '已達到最大圖片數量限制（8張）' }, { status: 400 })
		}

		let imageUrl: string

		// 上傳圖片
		if (process.env.BLOB_READ_WRITE_TOKEN) {
			// 使用 Vercel Blob
			const timestamp = Date.now()
			const filename = `gallery_${imageType}_${timestamp}_${Math.random().toString(36).substring(7)}.jpg`
			
			const blob = await put(filename, file, {
				access: 'public',
			})
			
			imageUrl = blob.url
		} else {
			// 本地儲存
			const bytes = await file.arrayBuffer()
			const buffer = Buffer.from(bytes)
			
			const timestamp = Date.now()
			const filename = `gallery_${imageType}_${timestamp}_${Math.random().toString(36).substring(7)}.jpg`
			const filepath = join(process.cwd(), 'public/uploads', filename)
			
			// 確保目錄存在
			await mkdir(join(process.cwd(), 'public/uploads'), { recursive: true })
			
			await writeFile(filepath, buffer)
			imageUrl = `/uploads/${filename}`
		}

		// 更新資料庫
		const updatedImages = [...currentImages, imageUrl]
		
		await prisma.orgSettings.update({
			where: { id: orgSettings.id },
			data: {
				[imageType === 'mobile' ? 'mobileGalleryImages' : 'desktopGalleryImages']: updatedImages
			}
		})

		return NextResponse.json({ 
			success: true, 
			imageUrl,
			message: '圖片上傳成功'
		})

	} catch (error) {
		console.error('Gallery image upload error:', error)
		return NextResponse.json(
			{ error: '上傳失敗，請稍後再試' },
			{ status: 500 }
		)
	}
}
