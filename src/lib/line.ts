import { prisma } from '@/lib/prisma'

// LINE機器人配置介面
interface LineBotConfig {
	channelId: string
	channelSecret: string
	name: string
}

// 獲取機器人配置列表
function getBotConfigs(): LineBotConfig[] {
	const configs: LineBotConfig[] = []
	
	// 主要機器人
	if (process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET) {
		configs.push({
			channelId: process.env.LINE_CHANNEL_ID,
			channelSecret: process.env.LINE_CHANNEL_SECRET,
			name: 'primary'
		})
	}
	
	// 備用機器人
	if (process.env.LINE_CHANNEL_ID_2 && process.env.LINE_CHANNEL_SECRET_2) {
		configs.push({
			channelId: process.env.LINE_CHANNEL_ID_2,
			channelSecret: process.env.LINE_CHANNEL_SECRET_2,
			name: 'backup'
		})
	}
	
	return configs
}

async function getChannelAccessToken(botConfig: LineBotConfig): Promise<string | null> {
	try {
		const res = await fetch('https://api.line.me/v2/oauth/accessToken', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				grant_type: 'client_credentials',
				client_id: botConfig.channelId,
				client_secret: botConfig.channelSecret,
			}).toString(),
		})
		if (!res.ok) return null
		const data = await res.json().catch(() => null) as { access_token?: string } | null
		return data?.access_token || null
	} catch {
		return null
	}
}

// 獲取當前可用的機器人Token
export async function getAvailableBotToken(): Promise<{ token: string | null; botName: string }> {
	const configs = getBotConfigs()
	if (configs.length === 0) return { token: null, botName: 'none' }
	
	// 獲取當前機器人狀態
	const orgSettings = await prisma.orgSettings.findUnique({ where: { id: 'singleton' } })
	const currentBot = orgSettings?.currentLineBot || 'primary'
	
	// 檢查是否需要嘗試恢復主要機器人
	if (currentBot === 'backup' && orgSettings?.botRecoveryAttempts && orgSettings.botRecoveryAttempts < 3) {
		const lastErrorTime = orgSettings.lastPrimaryBotError
		const now = new Date()
		
		// 如果距離最後一次錯誤超過1小時，嘗試恢復主要機器人
		if (lastErrorTime && (now.getTime() - lastErrorTime.getTime()) > 60 * 60 * 1000) {
			const primaryConfig = configs.find(config => config.name === 'primary')
			if (primaryConfig) {
				const token = await getChannelAccessToken(primaryConfig)
				if (token) {
					// 恢復主要機器人
					await prisma.orgSettings.update({
						where: { id: 'singleton' },
						data: { 
							currentLineBot: 'primary',
							lineBotStatus: 'active',
							primaryBotErrorCount: 0,
							botRecoveryAttempts: { increment: 1 }
						}
					})
					console.log('已恢復主要機器人')
					return { token, botName: 'primary' }
				}
			}
		}
	}
	
	// 嘗試使用當前機器人
	const currentConfig = configs.find(config => config.name === currentBot)
	if (currentConfig) {
		const token = await getChannelAccessToken(currentConfig)
		if (token) {
			return { token, botName: currentConfig.name }
		}
	}
	
	// 如果當前機器人失敗，嘗試其他機器人
	for (const config of configs) {
		if (config.name !== currentBot) {
			const token = await getChannelAccessToken(config)
			if (token) {
				// 更新資料庫中的機器人狀態
				await prisma.orgSettings.upsert({
					where: { id: 'singleton' },
					create: { 
						id: 'singleton', 
						bankInfo: '', 
						currentLineBot: config.name,
						lineBotStatus: 'active',
						lastLineBotSwitch: new Date()
					},
					update: { 
						currentLineBot: config.name,
						lineBotStatus: 'active',
						lastLineBotSwitch: new Date()
					}
				})
				console.log(`已切換到備用機器人: ${config.name}`)
				return { token, botName: config.name }
			}
		}
	}
	
	return { token: null, botName: 'none' }
}

export async function pushToLineGroup(message: string): Promise<boolean> {
	const { token, botName } = await getAvailableBotToken()
	if (!token) return false
	const org = await prisma.orgSettings.findUnique({ where: { id: 'singleton' } })
	const to = org?.lineGroupId
	if (!to) return false
	
	try {
		const res = await fetch('https://api.line.me/v2/bot/message/push', {
			method: 'POST',
			headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify({ to, messages: [{ type: 'text', text: message.slice(0, 5000) }] }),
		})
		
		// 監控API回應狀態
		if (!res.ok) {
			const errorText = await res.text().catch(() => 'Unknown error')
			console.log(`LINE API錯誤 (機器人: ${botName}): ${res.status} - ${errorText}`)
			
			// 檢查是否為額度相關錯誤
			if (res.status === 429 || res.status === 403) {
				console.log(`機器人 ${botName} 可能已達到額度上限，嘗試切換機器人`)
				
				// 更新錯誤計數和狀態
				await prisma.orgSettings.upsert({
					where: { id: 'singleton' },
					create: { 
						id: 'singleton', 
						bankInfo: '', 
						currentLineBot: 'primary',
						lineBotStatus: 'quota_exceeded',
						primaryBotErrorCount: 1,
						lastPrimaryBotError: new Date()
					},
					update: { 
						lineBotStatus: 'quota_exceeded',
						primaryBotErrorCount: { increment: 1 },
						lastPrimaryBotError: new Date()
					}
				})
			}
			return false
		}
		
		console.log(`LINE訊息推送成功 (機器人: ${botName})`)
		return true
	} catch (error) {
		console.log(`LINE推送異常 (機器人: ${botName}):`, error)
		return false
	}
}

export async function replyToLine(replyToken: string, message: string): Promise<boolean> {
	const { token, botName } = await getAvailableBotToken()
	if (!token) return false
	
	try {
		const res = await fetch('https://api.line.me/v2/bot/message/reply', {
			method: 'POST',
			headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify({ replyToken, messages: [{ type: 'text', text: message.slice(0, 5000) }] }),
		})
		
		// 監控API回應狀態
		if (!res.ok) {
			const errorText = await res.text().catch(() => 'Unknown error')
			console.log(`LINE API回覆錯誤 (機器人: ${botName}): ${res.status} - ${errorText}`)
			
			// 檢查是否為額度相關錯誤
			if (res.status === 429 || res.status === 403) {
				console.log(`機器人 ${botName} 可能已達到額度上限，嘗試切換機器人`)
				// 標記當前機器人為不可用
				await prisma.orgSettings.upsert({
					where: { id: 'singleton' },
					create: { id: 'singleton', bankInfo: '', currentLineBot: 'primary' },
					update: { currentLineBot: 'primary' }, // 重置為主要機器人，讓下次嘗試其他機器人
				})
			}
			return false
		}
		
		console.log(`LINE訊息回覆成功 (機器人: ${botName})`)
		return true
	} catch (error) {
		console.log(`LINE回覆異常 (機器人: ${botName}):`, error)
		return false
	}
}

export async function pushSolonByEvent(eventId: string, generate: (id: string) => Promise<string>): Promise<void> {
	try {
		const msg = await generate(eventId)
		if (!msg) return
		await pushToLineGroup(msg)
	} catch {
		// ignore push errors
	}
}


