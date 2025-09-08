"use client"

import Button from '@/components/ui/Button'

export default function SpeakerShareButton({ message, url, imageUrl }: { message: string; url: string; imageUrl?: string }) {
	const handleShare = async () => {
		const fullMessage = `${message || '磐石砌好厝誠摯地邀請您一同來參與'}\n\n預約連結: ${url}`
		const clipboardText = imageUrl ? `${fullMessage}\n圖片: ${imageUrl}` : fullMessage
		try {
			let files: File[] | undefined
			if (imageUrl) {
				try {
					const res = await fetch(imageUrl)
					const blob = await res.blob()
					const filename = imageUrl.split('/').pop() || 'invite.jpg'
					const file = new File([blob], filename, { type: blob.type || 'image/jpeg' })
					if (navigator.canShare && navigator.canShare({ files: [file] })) {
						files = [file]
					}
				} catch {}
			}

			if (navigator.share) {
				const shareData: ShareData & { files?: File[] } = { title: '講師預約', text: fullMessage, url }
				if (files) shareData.files = files
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
		<Button variant="primary" size="sm" onClick={handleShare}>講師邀請</Button>
	)
}
