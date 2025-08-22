'use client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function MonthSelector({ currentMonth }: { currentMonth: string }) {
	const router = useRouter()
	const searchParams = useSearchParams()

	// 生成最近12個月的選項
	const monthOptions = Array.from({ length: 12 }, (_, i) => {
		const date = new Date()
		date.setMonth(date.getMonth() - i)
		const monthStr = date.toISOString().slice(0, 7)
		const displayName = `${date.getFullYear()}年${date.getMonth() + 1}月`
		return { value: monthStr, label: displayName }
	})

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
			<label className="text-sm font-medium">選擇月份：</label>
			<select 
				value={currentMonth}
				onChange={(e) => handleMonthChange(e.target.value)}
				className="px-3 py-1 border rounded text-sm"
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
