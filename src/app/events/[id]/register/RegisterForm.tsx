'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

interface RegisterFormProps {
	children: React.ReactNode
	action: (formData: FormData) => Promise<void>
	existingReg?: any
}

export default function RegisterForm({ children, action, existingReg }: RegisterFormProps) {
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
			
			<div className="flex items-center gap-3">
				<Button 
					type="submit" 
					variant="primary" 
					disabled={isSubmitting}
				>
					{isSubmitting ? '處理中...' : (existingReg ? '更新報名' : '送出報名')}
				</Button>
			</div>
		</form>
	)
}
