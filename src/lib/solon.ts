import { prisma } from '@/lib/prisma'
import { EventType, RegistrationStatus } from '@prisma/client'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

function week(date: Date) {
	return format(date, 'EEEEE', { locale: zhTW })
}

export async function generateSolonMessage(eventId: string): Promise<string> {
	const event = await prisma.event.findUnique({ where: { id: eventId } })
	if (!event) return ''
	const [eventMenu, regs, speakers] = await Promise.all([
		prisma.eventMenu.findUnique({ where: { eventId } }),
		prisma.registration.findMany({ where: { eventId, status: 'REGISTERED' as RegistrationStatus }, include: { user: { select: { nickname: true, name: true } } }, orderBy: { createdAt: 'asc' } }),
		prisma.speakerBooking.findMany({ where: { eventId }, orderBy: { createdAt: 'asc' } }),
	])

	// 標題行：MM/DD(週) + 標題
	const titleLine = `${format(event.startAt, 'MM/dd', { locale: zhTW })}(${week(event.startAt)}) ${event.title}`
	// 時間行：🌟時間:HH:mm-HH:mm；僅 GENERAL/JOINT/CLOSED 顯示 (活動19:00開始)
	const timeSpan = `${format(event.startAt, 'HH:mm')}-${format(event.endAt, 'HH:mm')}`
	const timeLine = `🌟時間:${timeSpan}${is19Start(event.type) ? '；(活動19:00開始)' : ''}`
	// 地點行
	const locationLine = `🌟地點：${event.location || '-'}`

	let menuLines = ''
	if (eventMenu?.hasMealService) {
		const a = eventMenu.mealCodeA ? `A.${eventMenu.mealCodeA}` : ''
		const b = eventMenu.mealCodeB ? `B.${eventMenu.mealCodeB}` : ''
		const c = eventMenu.mealCodeC ? `C.${eventMenu.mealCodeC}` : ''
		menuLines = ['🌟菜單：', a, b, c].filter(Boolean).join('\n                ')
	}

	const cutoffLine = '🌟請在週日晚上10點前截單！以便追蹤出席人數及訂餐喔💙'
	const priceLine = priceByType(event)
	const contentLine = event.content ? `🌟內容：${event.content}` : ''

	// 清單
	const memberList = regs.filter(r => r.role === 'MEMBER').map((r, idx) => `${idx + 1}.${displayMemberName(r.user?.nickname, r.user?.name || r.name)}${mealOrDiet(eventMenu, r.mealCode, r.diet, r.noBeef, r.noPork)}`).join('\n')
	const guestList = regs.filter(r => r.role === 'GUEST').map((r, idx) => `${idx + 1}.${[r.name, r.bniChapter, r.industry, r.companyName, r.invitedBy].filter(Boolean).join('/')}${mealOrDiet(eventMenu, r.mealCode, r.diet, r.noBeef, r.noPork)}`).join('\n')
	const speakerList = speakers.map((s, idx) => `${idx + 1}.${[s.name, s.bniChapter, s.industry, s.companyName, s.invitedBy].filter(Boolean).join('/')}${mealOrDiet(eventMenu, s.mealCode, s.diet, s.noBeef, s.noPork)}`).join('\n')

	const lines: string[] = [
		titleLine,
		timeLine,
		locationLine,
		menuLines,
		cutoffLine,
		priceLine,
		contentLine,
		'歡迎夥伴們熱烈參與👍🏻👍🏻👍🏻',
		'🌟參加接龍+訂餐：',
		memberList,
	]

	if (guestList) {
		lines.push('', '🌟來賓', guestList)
	}
	if (speakerList) {
		lines.push('', '🌟講師', speakerList)
	}

	return lines.filter(Boolean).join('\n')
}

function typeLabel(t: EventType) {
	return ({ GENERAL: '簡報組聚', JOINT: '聯合組聚', CLOSED: '封閉會議', BOD: 'BOD', DINNER: '餐敘', SOFT: '軟性活動', VISIT: '職業參訪' } as Record<EventType, string>)[t]
}

function is19Start(t: EventType) {
	return t === 'GENERAL' || t === 'JOINT' || t === 'CLOSED'
}

function priceByType(event: { type: EventType; guestPriceCents: number | null; defaultPriceCents: number | null; bodMemberPriceCents: number | null; bodGuestPriceCents: number | null; }): string {
	if (event.type === 'GENERAL' || event.type === 'JOINT' || event.type === 'CLOSED') {
		return '🌟固定成員月收180/次💚單次成員220/次💛來賓們 250/次'
	}
	const parts: string[] = []
	if (event.defaultPriceCents && event.defaultPriceCents > 0) parts.push(`成員 ${event.defaultPriceCents / 100}/次`)
	if (event.guestPriceCents && event.guestPriceCents > 0) parts.push(`來賓 ${event.guestPriceCents / 100}/次`)
	if (event.type === 'BOD') {
		if (event.bodMemberPriceCents && event.bodMemberPriceCents > 0) parts.push(`成員 ${event.bodMemberPriceCents / 100}/次`)
		if (event.bodGuestPriceCents && event.bodGuestPriceCents > 0) parts.push(`來賓 ${event.bodGuestPriceCents / 100}/次`)
	}
	return parts.length ? `🌟${parts.join(' ')}` : ''
}

type EventMenuShape = { hasMealService?: boolean } | null | undefined

function displayMemberName(nickname?: string | null, name?: string | null) {
	if (nickname && nickname.trim()) return nickname
	const n = (name || '').trim()
	return n.length >= 2 ? n.slice(-2) : (n || '-')
}

function mealOrDiet(eventMenu: EventMenuShape, mealCode?: string | null, diet?: string | null, noBeef?: boolean | null, noPork?: boolean | null) {
	if (eventMenu?.hasMealService) return mealCode ? ` ${mealCode}` : ''
	if (diet === 'veg') return ' 素食'
	const parts: string[] = []
	if (noBeef) parts.push('不吃牛')
	if (noPork) parts.push('不吃豬')
	return parts.length ? ` 葷食（${parts.join('、')}）` : ' 葷食'
}


