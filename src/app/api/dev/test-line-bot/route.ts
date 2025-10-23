import { NextRequest, NextResponse } from 'next/server'
import { getAvailableBotToken } from '@/lib/line'
import { prisma } from '@/lib/prisma'

export async function GET() {
	try {
		// 檢查機器人配置
		const hasPrimaryBot = !!(process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET)
		const hasBackupBot = !!(process.env.LINE_CHANNEL_ID_2 && process.env.LINE_CHANNEL_SECRET_2)
		
		// 測試機器人連接
		const { token, botName } = await getAvailableBotToken()
		
		// 獲取組織設定
		const orgSettings = await prisma.orgSettings.findUnique({ where: { id: 'singleton' } })
		
		return NextResponse.json({
			success: true,
			data: {
				config: {
					primaryBot: hasPrimaryBot ? '已配置' : '未配置',
					backupBot: hasBackupBot ? '已配置' : '未配置'
				},
				status: {
					currentBot: botName,
					tokenAvailable: !!token,
					lineGroupId: orgSettings?.lineGroupId || '未綁定',
					currentLineBot: orgSettings?.currentLineBot || 'primary',
					lineBotStatus: orgSettings?.lineBotStatus || 'active'
				},
				environment: {
					primaryChannelId: process.env.LINE_CHANNEL_ID ? '已設定' : '未設定',
					primaryChannelSecret: process.env.LINE_CHANNEL_SECRET ? '已設定' : '未設定',
					backupChannelId: process.env.LINE_CHANNEL_ID_2 ? '已設定' : '未設定',
					backupChannelSecret: process.env.LINE_CHANNEL_SECRET_2 ? '已設定' : '未設定'
				}
			}
		})
	} catch (error) {
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : '未知錯誤'
		}, { status: 500 })
	}
}
