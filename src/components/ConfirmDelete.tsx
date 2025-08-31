"use client"
import React from 'react'
import Button from '@/components/ui/Button'

export default function ConfirmDelete({
	eventId,
	action,
	label = '刪除活動',
	hasLocks = false,
	members = [],
	guests = [],
	speakers = [],
	isIcon = false,
}: {
	eventId: string
	action: (formData: FormData) => void
	label?: string
	hasLocks?: boolean
	members?: string[]
	guests?: string[]
	speakers?: string[]
	isIcon?: boolean
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
	}

	return (
		<form action={action} onSubmit={onSubmit}>
			<input type="hidden" name="id" value={eventId} />
			{isIcon ? (
				<Button 
					type="submit" 
					className="bg-gray-400 hover:bg-gray-500 text-white p-2"
				>
					🗑️
				</Button>
			) : (
				<Button type="submit" variant="danger">{label}</Button>
			)}
		</form>
	)
}


