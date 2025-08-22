'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import { Copy } from 'lucide-react'

export default function MemberInvitation() {
	const [inviteUrl, setInviteUrl] = useState<string>('')
	const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
	const [loading, setLoading] = useState(false)
	const [showModal, setShowModal] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const generateInviteLink = async () => {
		setLoading(true)
		setError(null)
		try {
			const response = await fetch('/api/admin/invite-token', { method: 'POST' })
			const data = await response.json()
			
			if (response.ok && data.token) {
				const url = `${window.location.origin}/auth/signup?invite=${data.token}`
				setInviteUrl(url)
				// 生成 QR Code（使用免費的 QR Code API）
				setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`)
			} else {
				setError(data.error || '生成邀請連結失敗')
			}
		} catch (error) {
			console.error('生成邀請連結失敗:', error)
			setError('網路錯誤，請稍後再試')
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

	const handleOpenModal = () => {
		setShowModal(true)
		if (!inviteUrl) {
			generateInviteLink()
		}
	}

	return (
		<>
			<Button onClick={handleOpenModal} variant="primary">邀請新成員</Button>

			{/* 邀請彈窗 */}
			{showModal && (
				<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="font-medium text-lg">邀請新成員</h2>
							<Button 
								onClick={() => setShowModal(false)}
								variant="ghost"
								size="sm"
							>
								✕
							</Button>
						</div>

						{loading ? (
							<div className="text-center py-4 text-gray-500">生成邀請連結中...</div>
						) : error ? (
							<div className="text-center py-4 space-y-2">
								<div className="text-red-600">{error}</div>
								<Button onClick={generateInviteLink} variant="outline" size="sm">
									重新生成
								</Button>
							</div>
						) : (
							<div className="space-y-4">
								{/* 邀請連結 */}
								<div className="space-y-2">
									<label className="text-sm font-medium text-gray-700">邀請連結</label>
									<div className="flex gap-2">
										<input 
											value={inviteUrl}
											readOnly
											className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
										/>
										<Button 
											onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
												copyToClipboard(inviteUrl, e.target as HTMLButtonElement)
											}}
											variant="outline"
											size="sm"
										>
											<Copy className="w-4 h-4" />
										</Button>
									</div>
								</div>

								{/* QR Code */}
								{qrCodeUrl && (
									<div className="text-center">
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img 
											src={qrCodeUrl} 
											alt="邀請 QR Code" 
											className="w-40 h-40 mx-auto border rounded-lg bg-white p-2"
										/>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</>
	)
}
