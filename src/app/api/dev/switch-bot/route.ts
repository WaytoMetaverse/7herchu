import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
	try {
		// 獲取當前機器人狀態
		const orgSettings = await prisma.orgSettings.findUnique({ where: { id: 'singleton' } })
		const currentBot = orgSettings?.currentLineBot || 'primary'
		
		// 切換到備用機器人
		const newBot = currentBot === 'primary' ? 'backup' : 'primary'
		
		await prisma.orgSettings.update({
			where: { id: 'singleton' },
			data: { 
				currentLineBot: newBot,
				lineBotStatus: 'active',
				lastLineBotSwitch: new Date()
			}
		})
		
		return NextResponse.json({
			success: true,
			message: `已切換到 ${newBot} 機器人`,
			data: {
				previousBot: currentBot,
				currentBot: newBot,
				switchTime: new Date().toISOString()
			}
		})
	} catch (error) {
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : '未知錯誤'
		}, { status: 500 })
	}
}
