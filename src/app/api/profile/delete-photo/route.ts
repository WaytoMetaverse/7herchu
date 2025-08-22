import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'node:fs/promises'
import path from 'node:path'

export async function POST(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.email) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const user = await prisma.user.findUnique({ where: { email: session.user.email } })
		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 })
		}

		const { url, type } = await req.json()
		if (!url || !type) {
			return NextResponse.json({ error: 'Missing url or type' }, { status: 400 })
		}

		if (type === 'photo') {
			const mp = await prisma.memberProfile.findUnique({ 
				where: { userId: user.id }, 
				select: { portfolioPhotos: true } 
			})
			const list = Array.isArray(mp?.portfolioPhotos) ? (mp?.portfolioPhotos as string[]) : []
			const next = list.filter((u) => u !== url)
			await prisma.memberProfile.update({ 
				where: { userId: user.id }, 
				data: { portfolioPhotos: next } 
			})
		} else if (type === 'card') {
			const mp = await prisma.memberProfile.findUnique({ 
				where: { userId: user.id }, 
				select: { businessCards: true } 
			})
			const list = Array.isArray(mp?.businessCards) ? (mp?.businessCards as string[]) : []
			const next = list.filter((u) => u !== url)
			await prisma.memberProfile.update({ 
				where: { userId: user.id }, 
				data: { businessCards: next } 
			})
		}

		// 嘗試刪除本地檔案
		try {
			const filePath = path.join(process.cwd(), 'public', url.replace(/^\/+/, ''))
			await fs.unlink(filePath)
		} catch {}

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error('Delete photo error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
