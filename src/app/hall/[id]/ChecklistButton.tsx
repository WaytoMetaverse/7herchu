'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import ChecklistModal from '@/components/ChecklistModal'
import { CheckSquare } from 'lucide-react'

interface ChecklistButtonProps {
	eventId: string
}

export default function ChecklistButton({ eventId }: ChecklistButtonProps) {
	const [isModalOpen, setIsModalOpen] = useState(false)

	return (
		<>
			<Button
				onClick={() => setIsModalOpen(true)}
				variant="outline"
				size="sm"
				className="flex items-center gap-2"
			>
				<CheckSquare className="w-4 h-4" />
				<span className="hidden sm:inline">檢核清單</span>
			</Button>
			<ChecklistModal
				eventId={eventId}
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			/>
		</>
	)
}

