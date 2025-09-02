'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'

interface InviteClientProps {
	inviteMessage: string
	inviteUrl: string
	eventTitle: string
}

export default function InviteClient({ inviteMessage, inviteUrl, eventTitle }: InviteClientProps) {
	const [copiedMessage, setCopiedMessage] = useState(false)
	const [copiedUrl, setCopiedUrl] = useState(false)

	const copyMessage = () => {
		navigator.clipboard.writeText(inviteMessage)
		setCopiedMessage(true)
		setTimeout(() => setCopiedMessage(false), 2000)
	}

	const copyUrl = () => {
		navigator.clipboard.writeText(inviteUrl)
		setCopiedUrl(true)
		setTimeout(() => setCopiedUrl(false), 2000)
	}

	const shareToLine = () => {
		if (navigator.share) {
			navigator.share({
				title: eventTitle,
				text: inviteMessage,
				url: inviteUrl
			}).catch(() => {
				// 如果分享失敗，回退到複製
				navigator.clipboard.writeText(inviteMessage)
			})
		} else {
			// 不支援 Web Share API，開啟 Line 分享
			const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(inviteMessage)}`
			window.open(lineUrl, '_blank')
		}
	}

	const shareToFacebook = () => {
		const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}&quote=${encodeURIComponent(inviteMessage)}`
		window.open(fbUrl, '_blank')
	}

	const shareMore = () => {
		if (navigator.share) {
			navigator.share({
				title: eventTitle,
				text: inviteMessage,
				url: inviteUrl
			})
		} else {
			// 回退到複製訊息
			navigator.clipboard.writeText(`${inviteMessage}`)
			alert('訊息已複製到剪貼簿，請手動分享到您想要的平台')
		}
	}

	return (
		<>
			{/* 邀請訊息 */}
			<div className="bg-white rounded-lg border p-4">
				<h2 className="font-medium mb-3">邀請訊息</h2>
				<div className="bg-gray-50 p-3 rounded text-sm font-mono whitespace-pre-line border">
					{inviteMessage}
				</div>
				<div className="mt-3 flex gap-2">
					<Button 
						onClick={copyMessage}
						variant="secondary" 
						size="sm"
					>
						{copiedMessage ? '已複製！' : '複製訊息'}
					</Button>
					<Button 
						onClick={copyUrl}
						variant="outline" 
						size="sm"
					>
						{copiedUrl ? '已複製！' : '複製連結'}
					</Button>
				</div>
			</div>

			{/* 分享按鈕 */}
			<div className="bg-white rounded-lg border p-4">
				<h2 className="font-medium mb-3">分享到</h2>
				<div className="grid grid-cols-2 gap-3">
					<Button 
						onClick={shareToLine}
						variant="primary" 
						className="bg-green-500 hover:bg-green-600"
					>
						Line 分享
					</Button>
					<Button 
						onClick={shareToFacebook}
						variant="primary"
						className="bg-blue-600 hover:bg-blue-700"
					>
						Facebook
					</Button>
				</div>
				
				{/* iOS/Android 原生分享 */}
				<div className="mt-3">
					<Button 
						onClick={shareMore}
						variant="outline"
						className="w-full"
					>
						📱 更多分享選項
					</Button>
				</div>
			</div>
		</>
	)
}
