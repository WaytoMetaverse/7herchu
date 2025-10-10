// 活動檢核清單模板

export const CHECKLIST_TEMPLATES = {
	BOD: [
		'確認時間、地點、費用、主題',
		'確認邀約對象產業別',
		'安排報到破冰活動',
		'設計九宮格主題',
		'安排簡報人員',
		'安排事前、事中、事後總負責人與負責人',
		'訂立來賓人數目標',
		'訂立BNI夥伴人數目標(確認是否有特別想邀請的夥伴)',
		'確認建築組夥伴參與人數(立刻確認接龍)',
		'設定來賓完成時間',
		'安排掌控來賓人數位置負責人',
		'確認海報、文案、報名連結',
		'完成主持人簡報',
	],
	JOINT: [
		'負責人找到該分會工程組源頭',
		'說明目的、時間、地點、費用',
		'確認是否有意願促成',
		'拉群組(庭煥/佩純/Max/宇宙/清皓)',
		'提供聯合組聚參考流程(佩純)',
		'確認雙方簡報(Max)',
		'提供餐點選擇與用餐彙整(宇宙)',
		'提供場地資訊與停車資訊(清皓)',
	],
} as const

export type ChecklistTemplateKey = keyof typeof CHECKLIST_TEMPLATES

export function getChecklistTemplate(eventType: string): string[] | null {
	if (eventType === 'BOD' || eventType === 'JOINT') {
		return [...CHECKLIST_TEMPLATES[eventType as ChecklistTemplateKey]]
	}
	return null
}

export function hasChecklistTemplate(eventType: string): boolean {
	return eventType === 'BOD' || eventType === 'JOINT'
}

