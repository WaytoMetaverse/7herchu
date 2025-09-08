"use client"

import Button from '@/components/ui/Button'

export default function SpeakerShareButton({ message, url, className }: { message: string; url: string; className?: string }) {
	const handleShare = async () => {
		const fullMessage = `${message || '磐石砌好厝誠摯地邀請您一同來參與'}`
		const clipboardText = `${fullMessage}\n\n${url}`
		try {
			if (navigator.share) {
				const shareData: ShareData = { title: '講師預約', text: fullMessage, url }
				await navigator.share(shareData)
				return
			}
			navigator.clipboard.writeText(clipboardText)
			alert('已複製邀請訊息，請貼上分享')
		} catch {
			navigator.clipboard.writeText(clipboardText)
			alert('已複製邀請訊息，請貼上分享')
		}
	}
	return (
		<Button variant="primary" size="sm" onClick={handleShare} className={className}>講師邀請</Button>
	)
}
