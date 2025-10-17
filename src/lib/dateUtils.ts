/**
 * 時間工具函數
 * 用於確保整個系統完全沒有時區轉換
 * 所有時間都以資料庫儲存的本地時間為準
 */

/**
 * 將任何時間輸入轉換為本地 Date 物件（不進行時區轉換）
 * @param input - Date 物件或 ISO 字串
 * @returns 本地 Date 物件
 */
export function parseLocalDate(input: Date | string): Date {
	if (input instanceof Date) {
		return input
	}
	
	if (typeof input === 'string') {
		// 手動解析 ISO 字串，避免時區轉換
		const [datePart, timePart] = input.split('T')
		const [year, month, day] = datePart.split('-').map(v => parseInt(v, 10))
		
		let hh = 0, mm = 0, ss = 0
		if (timePart) {
			const timeOnly = timePart.split('.')[0] // 移除毫秒
			const [h, m, s] = timeOnly.split(':')
			hh = parseInt(h, 10) || 0
			mm = parseInt(m, 10) || 0
			ss = parseInt(s, 10) || 0
		}
		
		return new Date(year, (month || 1) - 1, day || 1, hh, mm, ss)
	}
	
	throw new Error('Invalid date input')
}

/**
 * 將 Date 物件轉換為 ISO 字串（不包含時區資訊）
 * @param date - Date 物件
 * @returns 本地時間的 ISO 字串（YYYY-MM-DDTHH:mm:ss）
 */
export function toLocalISOString(date: Date): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')
	const seconds = String(date.getSeconds()).padStart(2, '0')
	
	return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

