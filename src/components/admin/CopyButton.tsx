'use client'
import Button from '@/components/ui/Button'

export default function CopyButton({ text, children }: { text: string, children: React.ReactNode }) {
	return (
		<Button 
			onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
				navigator.clipboard.writeText(text)
				const btn = e.target as HTMLButtonElement
				if (btn) {
					const original = btn.textContent
					btn.textContent = '已複製！'
					setTimeout(() => { btn.textContent = original }, 2000)
				}
			}}
			variant="secondary" 
			size="sm"
		>
			{children}
		</Button>
	)
}
