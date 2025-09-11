import { prisma } from '@/lib/prisma'

async function getChannelAccessToken(): Promise<string | null> {
	const channelId = process.env.LINE_CHANNEL_ID
	const channelSecret = process.env.LINE_CHANNEL_SECRET
	if (!channelId || !channelSecret) return null
	try {
		const res = await fetch('https://api.line.me/v2/oauth/accessToken', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				grant_type: 'client_credentials',
				client_id: channelId,
				client_secret: channelSecret,
			}).toString(),
		})
		if (!res.ok) return null
		const data = await res.json().catch(() => null) as { access_token?: string } | null
		return data?.access_token || null
	} catch {
		return null
	}
}

export async function pushToLineGroup(message: string): Promise<boolean> {
	const token = await getChannelAccessToken()
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
		return res.ok
	} catch {
		return false
	}
}

export async function replyToLine(replyToken: string, message: string): Promise<boolean> {
	const token = await getChannelAccessToken()
	if (!token) return false
	try {
		const res = await fetch('https://api.line.me/v2/bot/message/reply', {
			method: 'POST',
			headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify({ replyToken, messages: [{ type: 'text', text: message.slice(0, 5000) }] }),
		})
		return res.ok
	} catch {
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


