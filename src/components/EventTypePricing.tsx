"use client"
import { useEffect, useMemo, useState } from 'react'

export type TypeOption = { value: string; label: string }

export default function EventTypePricing({
	options,
	initialType,
	initialTitle,
	initialGuestPrice,
	initialBodMemberPrice,
	initialBodGuestPrice,
	initialDefaultPrice,
	typeName = 'type',
	titleName = 'title',
}: {
	options: TypeOption[]
	initialType: string
	initialTitle?: string
	initialGuestPrice?: number | null
	initialBodMemberPrice?: number | null
	initialBodGuestPrice?: number | null
	initialDefaultPrice?: number | null
	typeName?: string
	titleName?: string
}) {
	const labelMap = useMemo(() => Object.fromEntries(options.map(o => [o.value, o.label])), [options])
	const [selectedType, setSelectedType] = useState<string>(initialType || options[0]?.value)
	const [title, setTitle] = useState<string>(initialTitle || '')

	useEffect(() => {
		const def = labelMap[selectedType] || ''
		if (!title || options.some(o => o.label === title)) {
			setTitle(def)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedType])

	const isBod = selectedType === 'BOD'
	const isDinner = selectedType === 'DINNER'
	const isSoft = selectedType === 'SOFT'
	const showGuestSingle = !isBod && !isDinner && !isSoft && selectedType !== 'CLOSED'
	const showVariablePricing = isBod || isDinner || isSoft

	return (
		<div className="contents">
			<label>類型
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
			<label>標題
				<input
					name={titleName}
					placeholder={labelMap[selectedType] || ''}
					value={title}
					onChange={(e) => setTitle(e.target.value)}
				/>
			</label>

			{/* 金額區塊（依類型顯示） */}
			{showGuestSingle && (
				<label className="col-span-2">來賓金額（元）
					<input name="guestPrice" type="number" min={0} defaultValue={initialGuestPrice ?? 250}  />
				</label>
			)}
			{isBod && (
				<div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
					<label>成員金額（元）
						<input name="bodMemberPrice" type="number" min={0} defaultValue={initialBodMemberPrice ?? ''}  />
					</label>
					<label>來賓金額（元）
						<input name="bodGuestPrice" type="number" min={0} defaultValue={initialBodGuestPrice ?? ''}  />
					</label>
				</div>
			)}
			{(isDinner || isSoft) && (
				<div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
					<label>成員金額（元）
						<input name="defaultPrice" type="number" min={0} defaultValue={initialDefaultPrice ?? ''}  />
					</label>
					<label>來賓金額（元）
						<input name="guestPrice" type="number" min={0} defaultValue={initialGuestPrice ?? ''}  />
					</label>
				</div>
			)}
		</div>
	)
}
