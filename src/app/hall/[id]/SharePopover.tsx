'use client'
import Button from '@/components/ui/Button'

interface SharePopoverProps {
	event: {
		id: string
		title: string
		startAt: Date | string
		endAt?: Date | string
		location: string | null
		type: string
	}
	invitationMessage: string
	invitationCardUrl: string | null
	eventDateLabel: string
	eventTimeLabel: string
	guestPriceLabel?: string
}

export default function SharePopover({ event, invitationMessage, eventDateLabel, eventTimeLabel, guestPriceLabel }: SharePopoverProps) {
	// 生成邀請訊息和連結
	const inviteUrl = `${process.env.NEXT_PUBLIC_URL || 'https://7herchu.vercel.app'}/events/${event.id}/guest-register?openExternalBrowser=1`
	
	const fullMessage = `${invitationMessage}

日期 | ${eventDateLabel}
時間 | ${eventTimeLabel}
地點 | ${event.location || '地點詳見活動資訊'}
${guestPriceLabel ? `\n費用 | ${guestPriceLabel}` : ''}

報名連結: ${inviteUrl}`

	const handleShare = () => {
		if (navigator.share) {
			navigator.share({
				title: event.title,
				text: fullMessage,
			}).catch(() => {
				// 使用者取消分享，不做任何事
			})
		} else {
			// 不支援 Web Share API，複製訊息
			navigator.clipboard.writeText(fullMessage)
			alert('訊息已複製到剪貼簿，請手動分享到您想要的平台')
		}
	}

	return (
		<Button 
			variant="primary" 
			size="sm"
			onClick={handleShare}
		>
			來賓邀請
		</Button>
	)
}
