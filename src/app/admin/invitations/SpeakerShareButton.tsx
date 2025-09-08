"use client"

import Button from '@/components/ui/Button'

export default function SpeakerShareButton({ message, url }: { message: string; url: string }) {
	const handleShare = () => {
		const fullMessage = `${message || '磐石砌好厝誠摯地邀請您一同來參與'}\n\n預約連結: ${url}`
		if (navigator.share) {
			navigator.share({ title: '講師預約', text: fullMessage, url }).catch(() => {})
		} else {
			navigator.clipboard.writeText(fullMessage)
			alert('訊息已複製到剪貼簿，請手動分享')
		}
	}
	return (
		<Button variant="primary" size="sm" onClick={handleShare}>分享講師邀請</Button>
	)
}
