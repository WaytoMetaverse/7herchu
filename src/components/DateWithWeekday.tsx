"use client"
import { useEffect, useState } from 'react'

export default function DateWithWeekday({
	name,
	defaultValue,
	label = '日期',
}: {
	name: string
	defaultValue?: string
	label?: string
}) {
	const [value, setValue] = useState<string>(defaultValue || '')

	// 當 defaultValue 變更（例如由伺服端帶入）時，同步到本地顯示
	useEffect(() => {
		if (defaultValue) setValue(defaultValue)
	}, [defaultValue])

	const weekday = (() => {
		if (!value) return ''
		const d = new Date(`${value}T00:00:00`)
		if (isNaN(d.getTime())) return ''
		const map = ['日', '一', '二', '三', '四', '五', '六']
		return `(${map[d.getDay()]})`
	})()

	return (
		<label className="text-sm">
			{label}
			<div className="flex items-center gap-2">
				<input
					name={name}
					type="date"
					defaultValue={defaultValue}
					onChange={(e) => setValue(e.target.value)}
					
				/>
				<span className="text-gray-600 text-sm min-w-[2rem]">{weekday}</span>
			</div>
		</label>
	)
}


