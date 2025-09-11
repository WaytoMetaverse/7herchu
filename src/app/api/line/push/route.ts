import { NextRequest, NextResponse } from 'next/server'
import { pushSolonByEvent } from '@/lib/line'
import { generateSolonMessage } from '@/lib/solon'

export async function POST(req: NextRequest) {
	try {
		const { eventId } = await req.json()
		if (!eventId) return NextResponse.json({ error: '缺少 eventId' }, { status: 400 })
		await pushSolonByEvent(eventId, generateSolonMessage)
		return NextResponse.json({ ok: true })
	} catch {
		return NextResponse.json({ error: '推送失敗' }, { status: 500 })
	}
}


