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
					className="text-gray-400 hover:text-gray-600 p-1.5"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
					</svg>
				</Button>
			) : (
				<Button type="submit" variant="danger">{label}</Button>
			)}
		</form>
	)
}


