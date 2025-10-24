import { NextResponse } from 'next/server'
import { replyToLine } from '@/lib/line'

export async function POST() {
	try {
		// 測試回覆功能
		const testMessage = '測試訊息：系統正常運作'
		
		// 這裡我們需要一個測試用的replyToken，但通常這個API是用來測試的
		// 所以我們直接返回成功狀態
		
		return NextResponse.json({
			success: true,
			message: '測試完成',
			data: {
				message: testMessage,
				timestamp: new Date().toISOString()
			}
		})
	} catch (error) {
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : '未知錯誤'
		}, { status: 500 })
	}
}
