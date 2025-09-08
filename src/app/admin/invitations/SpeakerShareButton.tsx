"use client"

import Button from '@/components/ui/Button'

export default function SpeakerShareButton({ message, url }: { message: string; url: string }) {
	const handleShare = async () => {
		const fullMessage = `磐石砌好厝成員邀請\n\n${message || '磐石砌好厝誠摯地邀請您一同來參與'}\n\n預約連結: ${url}`
		try {
			if (navigator.share) {
				const shareData: ShareData = { title: '講師預約', text: fullMessage, url }
				await navigator.share(shareData)
				return
			}
			// Fallback：無法 share 時，複製文字
			navigator.clipboard.writeText(fullMessage)
			alert('已複製邀請訊息，請貼上分享')
		} catch {
			navigator.clipboard.writeText(fullMessage)
			alert('已複製邀請訊息，請貼上分享')
		}
	}
	return (
		<Button variant="primary" size="sm" onClick={handleShare}>講師邀請</Button>
	)
}
