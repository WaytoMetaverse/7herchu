import { NextRequest, NextResponse } from 'next/server'

type OcrResult = {
	name?: string
	company?: string
	title?: string
	email?: string
	phone?: string
	address?: string
	website?: string
	notes?: string
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json().catch(() => null) as { imageUrl?: string } | null
		const imageUrl = body?.imageUrl?.trim()
		if (!imageUrl) return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 })

		const apiKey = process.env.OPENAI_API_KEY
		if (!apiKey) {
			return NextResponse.json({ error: 'AI unavailable: missing OPENAI_API_KEY' }, { status: 501 })
		}

		const prompt = `你是一位名片資訊擷取助手。請從名片圖片中讀取主要資訊並輸出 JSON（無多餘文字）。\n欄位：\n- name: 姓名\n- company: 公司名稱\n- title: 職稱\n- email: Email\n- phone: 手機或電話（只保留數字與+號、#、分機）\n- address: 地址（若有）\n- website: 網站（若有，含 http/https）\n- notes: 其他補充（若有）\n`;

		const res = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				response_format: { type: 'json_object' },
				messages: [
					{ role: 'system', content: prompt },
					{
						role: 'user',
						content: [
							{ type: 'text', text: '請擷取名片資訊並輸出 JSON。' },
							{ type: 'image_url', image_url: { url: imageUrl } },
						],
					},
				],
				temperature: 0.2,
				max_tokens: 500,
			}),
		})
		if (!res.ok) {
			const err = await res.text().catch(() => '')
			return NextResponse.json({ error: `openai error: ${res.status}`, detail: err }, { status: 502 })
		}
		const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
		const content = data?.choices?.[0]?.message?.content || ''
		let parsed: OcrResult = {}
		try {
			parsed = JSON.parse(content) as OcrResult
		} catch { parsed = {} }
		return NextResponse.json({ ok: true, result: {
			name: parsed.name || '',
			company: parsed.company || '',
			title: parsed.title || '',
			email: parsed.email || '',
			phone: parsed.phone || '',
			address: parsed.address || '',
			website: parsed.website || '',
			notes: parsed.notes || '',
		} })
	} catch (e) {
		console.error('cards ocr error:', e)
		return NextResponse.json({ error: 'internal error' }, { status: 500 })
	}
}
