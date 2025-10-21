import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
	try {
		const eventId = 'cmfgunz5r000bl504jxbg774l'
		
		// 找到台中鍾師富的報名記錄
		const registration = await prisma.registration.findFirst({
			where: {
				eventId,
				OR: [
					{ name: { contains: '鍾師富' } },
					{ user: { name: { contains: '鍾師富' } } },
					{ user: { nickname: { contains: '鍾師富' } } }
				]
			}
		})

		if (!registration) {
			return NextResponse.json({ error: '找不到鍾師富的報名記錄' }, { status: 404 })
		}

		// 更新為素食C
		await prisma.registration.update({
			where: { id: registration.id },
			data: {
				diet: 'veg',
				mealCode: 'C'
			}
		})

		return NextResponse.json({ 
			ok: true, 
			message: '✓ 已將台中鍾師富改為素食C',
			updated: {
				name: registration.name,
				diet: 'veg',
				mealCode: 'C'
			}
		})

	} catch (error) {
		console.error('Fix error:', error)
		return NextResponse.json({ error: '修復失敗' }, { status: 500 })
	}
}

