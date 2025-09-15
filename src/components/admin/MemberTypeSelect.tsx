'use client'
import { useRef } from 'react'

export default function MemberTypeSelect({ 
	userId, 
	defaultValue, 
	updateMemberType 
}: { 
	userId: string
	defaultValue: string
	updateMemberType: (formData: FormData) => void
}) {
	const formRef = useRef<HTMLFormElement>(null)

	return (
		<form ref={formRef} action={updateMemberType} className="inline" key={userId + ':' + defaultValue}>
			<input type="hidden" name="userId" value={userId} />
			<select 
				name="memberType" 
				value={defaultValue}
				onChange={() => {
					if (formRef.current) {
						formRef.current.requestSubmit()
					}
				}}
				className="text-xs sm:text-sm border-0 bg-transparent cursor-pointer hover:bg-gray-50 rounded px-1"
			>
				<option value="FIXED">固定</option>
				<option value="SINGLE">單次</option>
			</select>
		</form>
	)
}
