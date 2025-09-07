'use client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function MonthSelector({ currentMonth }: { currentMonth: string }) {
	const router = useRouter()
	const searchParams = useSearchParams()

	// 生成月份選項：從 2025-09 開始到未來12個月（隱藏 9 月以前）
	const startDate = new Date('2025-09-01')
	const endDate = new Date()
	endDate.setMonth(endDate.getMonth() + 12) // 未來12個月
	
	const monthOptions = []
	const iterDate = new Date(startDate)
	
	while (iterDate <= endDate) {
		const monthStr = iterDate.toISOString().slice(0, 7)
		const displayName = `${iterDate.getFullYear()}年${iterDate.getMonth() + 1}月`
		monthOptions.push({ value: monthStr, label: displayName })
		iterDate.setMonth(iterDate.getMonth() + 1)
	}

	const handleMonthChange = (month: string) => {
		const params = new URLSearchParams(searchParams.toString())
		if (month === new Date().toISOString().slice(0, 7)) {
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
