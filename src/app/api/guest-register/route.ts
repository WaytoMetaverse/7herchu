import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		const { 
			eventId, 
			name, 
			phone, 
			companyName, 
			industry, 
			bniChapter, 
			invitedBy,
			mealCode,
			noBeef,
			noPork
		} = body

		// 驗證必填欄位
		if (!eventId || !name || !phone || !companyName || !industry || !invitedBy || !mealCode) {
			return NextResponse.json({ error: '請填寫所有必填欄位' }, { status: 400 })
		}

		// 驗證手機號碼格式
		if (!/^\d{10}$/.test(phone)) {
			return NextResponse.json({ error: '請輸入正確的10碼手機號碼' }, { status: 400 })
		}

		// 檢查活動是否存在
		const event = await prisma.event.findUnique({ where: { id: eventId } })
		if (!event) {
			return NextResponse.json({ error: '活動不存在' }, { status: 404 })
		}

		// 檢查是否允許來賓報名
		if (!event.allowGuests) {
			return NextResponse.json({ error: '此活動不開放來賓報名' }, { status: 400 })
		}

		// 檢查是否已報名（根據手機號碼）
		const existingReg = await prisma.registration.findUnique({
			where: { eventId_phone: { eventId, phone } }
		})

		if (existingReg) {
			return NextResponse.json({ error: '此手機號碼已報名過此活動' }, { status: 400 })
		}

		// 取得菜單項目資訊
		const eventMonth = new Date(event.startAt).toISOString().slice(0, 7)
		const menu = await prisma.menu.findUnique({
			where: { month: eventMonth },
			include: { items: true }
		})

		const menuItem = menu?.items.find(item => item.code === mealCode)
		let diet = 'meat'
		if (menuItem?.isVegetarian) diet = 'veg'

		// 建立來賓報名記錄
		const registration = await prisma.registration.create({
			data: {
				eventId,
				role: 'GUEST',
				name,
				phone,
				companyName,
				industry,
				bniChapter: bniChapter || null,
				invitedBy,
				mealCode,
				diet,
				noBeef: !!noBeef,
				noPork: !!noPork,
				paymentStatus: 'UNPAID'
			}
		})

		return NextResponse.json({ 
			ok: true, 
			id: registration.id,
			message: '報名成功！我們會在活動前與您聯繫。'
		})

	} catch (error) {
		console.error('Guest registration error:', error)
		return NextResponse.json({ error: '報名處理失敗' }, { status: 500 })
	}
}
