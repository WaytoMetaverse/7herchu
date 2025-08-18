"use client"
import React from 'react'

export default function ConfirmDelete({
	eventId,
	action,
	label = '刪除活動',
	hasLocks = false,
	members = [],
	guests = [],
	speakers = [],
}: {
	eventId: string
	action: (formData: FormData) => void
	label?: string
	hasLocks?: boolean
	members?: string[]
	guests?: string[]
	speakers?: string[]
}) {
	function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		if (hasLocks) {
			e.preventDefault()
			const lines: string[] = ['無法刪除：此活動已有報名或講師預約。']
			if (members.length) lines.push(`成員：${members.join('、')}`)
			if (guests.length) lines.push(`來賓：${guests.join('、')}`)
			if (speakers.length) lines.push(`講師：${speakers.join('、')}`)
			alert(lines.join('\n'))
		}
		// 若沒有鎖定名單，直接送出，不彈窗
	}

	return (
		<form action={action} onSubmit={onSubmit}>
			<input type="hidden" name="id" value={eventId} />
			<button type="submit" className="px-3 py-1 bg-red-600 text-white rounded">{label}</button>
		</form>
	)
}


