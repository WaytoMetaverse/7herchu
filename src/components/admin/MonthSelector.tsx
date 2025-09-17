'use client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function MonthSelector({ currentMonth }: { currentMonth: string }) {
	const router = useRouter()
	const searchParams = useSearchParams()

	// 生成 6 個月視窗：當月為中心，顯示 -2、-1、0、+1、+2、+3（可跨年）
	const now = new Date()
	const currentYear = now.getFullYear()
	const currentMonthNum = now.getMonth() + 1 // 1-12
	const monthOptions: { value: string; label: string }[] = []
	
	for (let offset = -2; offset <= 3; offset++) {
		const targetMonth = currentMonthNum + offset
		let year = currentYear
		let month = targetMonth
		
		// 處理跨年情況
		if (month <= 0) {
			year -= 1
			month += 12
		} else if (month > 12) {
			year += 1
			month -= 12
		}
		
		const monthStr = `${year}-${month.toString().padStart(2, '0')}`
		const displayName = `${year}年${month}月`
		monthOptions.push({ value: monthStr, label: displayName })
	}

	const handleMonthChange = (month: string) => {
		const params = new URLSearchParams(searchParams.toString())
		const now = new Date()
		const currentYear = now.getFullYear()
		const currentMonthNum = now.getMonth() + 1
		const currentMonthStr = `${currentYear}-${currentMonthNum.toString().padStart(2, '0')}`
		
		if (month === currentMonthStr) {
			params.delete('month')
		} else {
			params.set('month', month)
		}
		
		const queryString = params.toString()
		const url = queryString ? `?${queryString}` : '/admin/members'
		router.push(url)
	}

	return (
		<div className="flex items-center gap-2">
			<label className="text-sm font-medium whitespace-nowrap">選擇月份：</label>
			<select 
				value={currentMonth}
				onChange={(e) => handleMonthChange(e.target.value)}
				className="px-2 py-1 border rounded text-sm min-w-0 w-auto"
			>
				{monthOptions.map(option => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	)
}
