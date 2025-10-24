import { NextResponse } from 'next/server'

export async function GET() {
	try {
		const envCheck = {
			primaryChannelId: process.env.LINE_CHANNEL_ID ? '已設定' : '未設定',
			primaryChannelSecret: process.env.LINE_CHANNEL_SECRET ? '已設定' : '未設定',
			backupChannelId: process.env.LINE_CHANNEL_ID_2 ? '已設定' : '未設定',
			backupChannelSecret: process.env.LINE_CHANNEL_SECRET_2 ? '已設定' : '未設定',
			// 不顯示實際的secret值，只顯示是否設定
			primarySecretLength: process.env.LINE_CHANNEL_SECRET?.length || 0,
			backupSecretLength: process.env.LINE_CHANNEL_SECRET_2?.length || 0
		}
		
		return NextResponse.json({
			success: true,
			data: envCheck
		})
	} catch (error) {
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : '未知錯誤'
		}, { status: 500 })
	}
}
