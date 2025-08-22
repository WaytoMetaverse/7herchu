'use client'
import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { Copy, Users } from 'lucide-react'

export default function MemberInvitation() {

	const [inviteUrl, setInviteUrl] = useState<string>('')
	const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		generateInviteLink()
	}, [])

	const generateInviteLink = async () => {
		setLoading(true)
		try {
			const response = await fetch('/api/admin/invite-token', { method: 'POST' })
			const data = await response.json()
			if (response.ok) {
				const url = `${window.location.origin}/auth/signup?invite=${data.token}`
				setInviteUrl(url)
				// 生成 QR Code（使用免費的 QR Code API）
				setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`)
			}
		} catch (error) {
			console.error('生成邀請連結失敗:', error)
		} finally {
			setLoading(false)
		}
	}

	const copyToClipboard = (text: string, buttonElement: HTMLButtonElement) => {
		navigator.clipboard.writeText(text)
		const original = buttonElement.textContent
		buttonElement.textContent = '已複製！'
		setTimeout(() => { buttonElement.textContent = original }, 2000)
	}

	return (
		<div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
			<div className="flex items-center gap-2">
				<Users className="w-5 h-5 text-blue-600" />
				<h2 className="font-medium text-lg">邀請新成員</h2>
			</div>

			{loading ? (
				<div className="text-center py-4 text-gray-500">生成邀請連結中...</div>
			) : (
				<div className="space-y-4">
					{/* 邀請連結 */}
					<div className="space-y-2">
						<label className="text-sm font-medium text-gray-700">邀請連結（永久有效）</label>
						<div className="flex gap-2">
							<input 
								value={inviteUrl}
								readOnly
								className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
							/>
							<Button 
								onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
									copyToClipboard(inviteUrl, e.target as HTMLButtonElement)
								}}
								variant="outline"
								size="sm"
							>
								<Copy className="w-4 h-4 mr-1" />
								複製
							</Button>
						</div>
					</div>

					{/* QR Code */}
					<div className="space-y-2">
						<label className="text-sm font-medium text-gray-700">QR Code</label>
						<div className="flex items-center gap-4">
							{qrCodeUrl && (
								// eslint-disable-next-line @next/next/no-img-element
								<img 
									src={qrCodeUrl} 
									alt="邀請 QR Code" 
									className="w-32 h-32 border rounded-lg bg-white p-2"
								/>
							)}
							<div className="text-sm text-gray-600">
								<p>掃描此 QR Code 即可註冊加入</p>
								<p className="text-xs text-gray-500 mt-1">此連結永久有效，可重複使用</p>
							</div>
						</div>
					</div>

					{/* 使用說明 */}
					<div className="bg-white border border-blue-200 rounded p-3 text-sm">
						<h4 className="font-medium text-blue-800 mb-2">使用說明</h4>
						<ul className="text-blue-700 space-y-1 text-xs">
							<li>• 新成員可使用此連結註冊帳號</li>
							<li>• 支援 Email 註冊或 Google 登入</li>
							<li>• 連結永久有效，無使用次數限制</li>
							<li>• 只有管理員可以生成邀請連結</li>
						</ul>
					</div>
				</div>
			)}
		</div>
	)
}
