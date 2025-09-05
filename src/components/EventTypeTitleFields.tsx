"use client"
import { useEffect, useMemo, useState } from 'react'

export type TypeOption = { value: string; label: string }

export default function EventTypeTitleFields({
	options,
	initialType,
	initialTitle,
	typeName = 'type',
	titleName = 'title',
}: {
	options: TypeOption[]
	initialType: string
	initialTitle?: string
	typeName?: string
	titleName?: string
}) {
	const map = useMemo(() => Object.fromEntries(options.map(o => [o.value, o.label])), [options])
	const [selectedType, setSelectedType] = useState<string>(initialType || options[0]?.value)
	const [title, setTitle] = useState<string>(initialTitle || '')

	// 當切換類型時，若標題為空或等於舊的預設，則自動帶入新的預設
	useEffect(() => {
		const def = map[selectedType] || ''
		if (!title || options.some(o => o.label === title)) {
			setTitle(def)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedType])

	return (
		<div className="contents">
			<label className="text-sm">類型
				<select
					name={typeName}
					
					value={selectedType}
					onChange={(e) => setSelectedType(e.target.value)}
				>
					{options.map((o) => (
						<option key={o.value} value={o.value}>{o.label}</option>
					))}
				</select>
			</label>
			<label className="text-sm">標題
				<input
					name={titleName}
					
					placeholder="請輸入標題"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
				/>
			</label>
		</div>
	)
}
