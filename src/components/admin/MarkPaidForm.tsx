'use client'
import { useState } from 'react'

export default function MarkPaidForm({ 
	action, 
	userId, 
	month 
}: { 
	action: (formData: FormData) => Promise<void>
	userId: string
	month: string
}) {
	const [isSubmitting, setIsSubmitting] = useState(false)

	async function handleSubmit(formData: FormData) {
		if (isSubmitting) return
		
		setIsSubmitting(true)
		try {
			await action(formData)
		} catch (error) {
			console.error('Mark paid error:', error)
			// 重新啟用按鈕，讓用戶可以重試
			setIsSubmitting(false)
		}
		// 注意：成功後不需要重置 isSubmitting，因為頁面會重新載入
	}

	return (
		<form action={handleSubmit} className="inline">
			<input type="hidden" name="userId" value={userId} />
			<input type="hidden" name="month" value={month} />
			<button 
				type="submit" 
				disabled={isSubmitting}
				className={`text-xs whitespace-nowrap ${
					isSubmitting 
						? 'text-gray-400 cursor-not-allowed' 
						: 'text-red-600 hover:text-red-800'
				}`}
			>
				{isSubmitting ? '處理中...' : '未繳費'}
			</button>
		</form>
	)
}

