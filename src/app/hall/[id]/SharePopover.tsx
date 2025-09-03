'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

interface SharePopoverProps {
	event: {
		id: string
		title: string
		startAt: Date
		location: string | null
		type: string
	}
	invitationMessage: string
	invitationCardUrl: string | null
}

export default function SharePopover({ event, invitationMessage }: SharePopoverProps) {
	const [isOpen, setIsOpen] = useState(false)
	const [copiedMessage, setCopiedMessage] = useState(false)
	const [copiedLink, setCopiedLink] = useState(false)

	// 生成邀請訊息和連結
	const inviteUrl = `${process.env.NEXT_PUBLIC_URL || 'https://7herchu.vercel.app'}/events/${event.id}/guest-register`
	const eventDate = format(event.startAt, 'yyyy/MM/dd（EEEEE）', { locale: zhTW })
	const eventTime = format(event.startAt, 'HH:mm')
	
	const fullMessage = `${invitationMessage}

日期 | ${eventDate}
時間 | ${eventTime}
地點 | ${event.location || '地點詳見活動資訊'}

報名連結: ${inviteUrl}`

	const copyMessage = () => {
		navigator.clipboard.writeText(fullMessage)
		setCopiedMessage(true)
		setTimeout(() => setCopiedMessage(false), 2000)
	}

	const copyUrl = () => {
		navigator.clipboard.writeText(inviteUrl)
		setCopiedLink(true)
		setTimeout(() => setCopiedLink(false), 2000)
	}

	const shareToLine = () => {
		const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(fullMessage)}`
		window.open(lineUrl, '_blank')
		setIsOpen(false)
	}

	const shareToFacebook = () => {
		const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}&quote=${encodeURIComponent(fullMessage)}`
		window.open(fbUrl, '_blank')
		setIsOpen(false)
	}

	const shareMore = () => {
		if (navigator.share) {
			navigator.share({
				title: event.title,
				text: fullMessage,
				url: inviteUrl
			}).catch(() => {
				// 使用者取消分享
			})
		} else {
			// 不支援 Web Share API，複製訊息
			copyMessage()
			alert('訊息已複製到剪貼簿')
		}
		setIsOpen(false)
	}

	return (
		<div className="relative">
			<Button 
				variant="primary" 
				size="sm"
				onClick={() => setIsOpen(!isOpen)}
			>
				來賓邀請
			</Button>

			{isOpen && (
				<>
					{/* 背景遮罩 */}
					<div 
						className="fixed inset-0 z-40"
						onClick={() => setIsOpen(false)}
					/>
					
					{/* 分享選單 */}
					<div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-50">
						<div className="p-3 space-y-2">
							<Button 
								onClick={shareToLine}
								variant="outline" 
								size="sm"
								className="w-full justify-start"
							>
								<span className="mr-2">📱</span> Line 分享
							</Button>
							
							<Button 
								onClick={shareToFacebook}
								variant="outline"
								size="sm"
								className="w-full justify-start"
							>
								<span className="mr-2">📘</span> Facebook 分享
							</Button>
							
							<hr className="my-2" />
							
							<Button 
								onClick={copyMessage}
								variant="outline" 
								size="sm"
								className="w-full justify-start"
							>
								<span className="mr-2">📋</span> 
								{copiedMessage ? '已複製！' : '複製訊息'}
							</Button>
							
							<Button 
								onClick={copyUrl}
								variant="outline" 
								size="sm"
								className="w-full justify-start"
							>
								<span className="mr-2">🔗</span> 
								{copiedLink ? '已複製！' : '複製連結'}
							</Button>
							
							<hr className="my-2" />
							
							<Button 
								onClick={shareMore}
								variant="outline"
								size="sm"
								className="w-full justify-start"
							>
								<span className="mr-2">📤</span> 更多分享選項
							</Button>
						</div>
					</div>
				</>
			)}
		</div>
	)
}
