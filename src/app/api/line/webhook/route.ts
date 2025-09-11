import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { replyToLine } from '@/lib/line'

function verifySignature(rawBody: string, signature?: string | null) {
	const secret = process.env.LINE_CHANNEL_SECRET || ''
	if (!secret || !signature) return false
	const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('base64')
	return hmac === signature
}

export async function POST(req: NextRequest) {
	const raw = await req.text()
	const okSig = verifySignature(raw, req.headers.get('x-line-signature'))
	if (!okSig) return NextResponse.json({ ok: false }, { status: 401 })
	const body = JSON.parse(raw)
	const events = Array.isArray(body.events) ? body.events : []
	for (const ev of events) {
		const type = ev.type
		const source = ev.source || {}
		if (type === 'message' && ev.message?.type === 'text') {
			const text = (ev.message.text || '').trim()
			if (text === '綁定' && source.type === 'group' && source.groupId) {
				await prisma.orgSettings.upsert({
					where: { id: 'singleton' },
					create: { id: 'singleton', bankInfo: '', lineGroupId: source.groupId },
					update: { lineGroupId: source.groupId },
				})
				if (ev.replyToken) await replyToLine(ev.replyToken, '綁定成功，之後將自動推送接龍訊息。')
			}
		}
	}
	return NextResponse.json({ ok: true })
}


