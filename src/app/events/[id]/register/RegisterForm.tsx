'use client'

import { useState } from 'react'

interface RegisterFormProps {
	children: React.ReactNode
	action: (formData: FormData) => Promise<void>
	existingReg?: unknown
}

export default function RegisterForm({ children, action }: RegisterFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false)

	async function handleSubmit(formData: FormData) {
		if (isSubmitting) return
		
		setIsSubmitting(true)
		try {
			await action(formData)
		} catch (error) {
			console.error('Registration error:', error)
			// 重新啟用按鈕，讓用戶可以重試
			setIsSubmitting(false)
		}
	}

	return (
		<form action={handleSubmit} className="space-y-6">
			{children}
		</form>
	)
}
