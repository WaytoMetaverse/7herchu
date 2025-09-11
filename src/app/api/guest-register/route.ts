import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { pushSolonByEvent } from '@/lib/line'
import { generateSolonMessage } from '@/lib/solon'

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
		if (!eventId || !name || !phone || !companyName || !industry || !invitedBy) {
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

		// 取得活動餐點設定
		const eventMenu = await prisma.eventMenu.findUnique({
			where: { eventId: eventId }
		})

		let diet = 'meat'
		const finalMealCode = mealCode || null
		
		// 如果有餐點服務
		if (eventMenu?.hasMealService && mealCode) {
			if (mealCode === 'C') {
				diet = 'veg' // C餐點預設為素食
			}
		}
		// 如果沒有餐點服務，根據飲食偏好智能選擇
		else if (!eventMenu?.hasMealService) {
			// 如果兩者都不吃，預設為素食
			if (noBeef && noPork) {
				diet = 'veg'
			}
		}

		// 生成編輯密碼（與講師預約相同邏輯）
		const editPasswordHash = bcrypt.hashSync(phone, 10)

		// 建立來賓報名記錄
		const registration = await prisma.registration.create({
			data: {
				eventId,
				role: 'GUEST',
				name,
				phone,
				editPasswordHash,
				companyName,
				industry,
				bniChapter: bniChapter || null,
				invitedBy,
				mealCode: finalMealCode,
				diet,
				noBeef: !!noBeef,
				noPork: !!noPork,
				paymentStatus: 'UNPAID',
				status: 'REGISTERED'
			}
		})

		// 推送接龍訊息（忽略失敗）
		pushSolonByEvent(eventId, generateSolonMessage)

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
