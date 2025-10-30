'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import AnnouncementDialog from '@/components/AnnouncementDialog'
import { useRouter } from 'next/navigation'

export default function AnnouncementsClient() {
	const [isOpen, setIsOpen] = useState(false)
	const router = useRouter()

	const handleSuccess = () => {
		router.refresh() // 重新載入頁面以更新歷史記錄
	}

	return (
		<>
			<Button onClick={() => setIsOpen(true)}>
				發送公告推播
			</Button>
			<AnnouncementDialog
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				onSuccess={handleSuccess}
			/>
		</>
	)
}
