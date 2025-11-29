import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { replyToLine } from '@/lib/line'

function verifySignature(rawBody: string, signature?: string | null): { valid: boolean; botName: string | null } {
	if (!signature) {
		console.log('Webhook: 沒有簽名')
		return { valid: false, botName: null }
	}
	
	// 嘗試主要機器人的secret
	const primarySecret = process.env.LINE_CHANNEL_SECRET || ''
	if (primarySecret) {
		const hmac = crypto.createHmac('sha256', primarySecret).update(rawBody).digest('base64')
		if (hmac === signature) {
			console.log('Webhook: 主要機器人簽名驗證成功')
			return { valid: true, botName: 'primary' }
		}
	}
	
	// 嘗試備用機器人的secret
	const backupSecret = process.env.LINE_CHANNEL_SECRET_2 || ''
	if (backupSecret) {
		const hmac = crypto.createHmac('sha256', backupSecret).update(rawBody).digest('base64')
		if (hmac === signature) {
			console.log('Webhook: 備用機器人簽名驗證成功')
			return { valid: true, botName: 'backup' }
		}
	}
	
	console.log('Webhook: 簽名驗證失敗')
	console.log('Primary secret length:', primarySecret.length)
	console.log('Backup secret length:', backupSecret.length)
	console.log('Signature:', signature)
	return { valid: false, botName: null }
}

export async function POST(req: NextRequest) {
	const raw = await req.text()
	const sigResult = verifySignature(raw, req.headers.get('x-line-signature'))
	if (!sigResult.valid) return NextResponse.json({ ok: false }, { status: 401 })
	
	const body = JSON.parse(raw)
	const events = Array.isArray(body.events) ? body.events : []
	const botName = sigResult.botName || 'primary' // 根據簽名驗證結果判斷是哪個機器人
	
	for (const ev of events) {
		const type = ev.type
		const source = ev.source || {}
		if (type === 'message' && ev.message?.type === 'text') {
			const text = (ev.message.text || '').trim()
			if (text === '綁定') {
				if (source.type === 'group' && source.groupId) {
					// 根據收到訊息的機器人來設定 currentLineBot
					console.log(`[綁定] 收到綁定請求，機器人: ${botName}, 群組ID: ${source.groupId}`)
					
					// 更新群組ID和機器人狀態
					await prisma.orgSettings.upsert({
						where: { id: 'singleton' },
						create: { 
							id: 'singleton', 
							bankInfo: '', 
							lineGroupId: source.groupId,
							currentLineBot: botName,
							lineBotStatus: 'active'
						},
						update: { 
							lineGroupId: source.groupId,
							currentLineBot: botName,
							lineBotStatus: 'active'
						},
					})
					if (ev.replyToken) await replyToLine(ev.replyToken, `綁定成功，之後將自動推送接龍訊息。(機器人: ${botName})`)
				} else if (ev.replyToken) {
					await replyToLine(ev.replyToken, '請將機器人邀進群組後，在群組內輸入「綁定」。')
				}
			}
		}
		if (type === 'join' && source.type === 'group' && source.groupId) {
			console.log(`[加入群組] 機器人: ${botName}, 群組ID: ${source.groupId}`)
			await prisma.orgSettings.upsert({
				where: { id: 'singleton' },
				create: { 
					id: 'singleton', 
					bankInfo: '', 
					lineGroupId: source.groupId,
					currentLineBot: botName,
					lineBotStatus: 'active'
				},
				update: { 
					lineGroupId: source.groupId,
					currentLineBot: botName,
					lineBotStatus: 'active'
				},
			})
			if (ev.replyToken) await replyToLine(ev.replyToken, `已加入群組並綁定成功。(機器人: ${botName})`)
		}
	}
	return NextResponse.json({ ok: true })
}


