"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

const MAX_SIZE = 1024 * 1024 // 1MB

// 圖片壓縮函數
async function compressImage(file: File, maxBytes = MAX_SIZE): Promise<{ blob: Blob; filename: string }> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => {
			// 計算壓縮比例
			const maxDim = 1920 // 最大尺寸
			const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
			let width = Math.max(1, Math.round(img.width * scale))
			let height = Math.max(1, Math.round(img.height * scale))

			const canvas = document.createElement('canvas')
			const ctx = canvas.getContext('2d')!
			canvas.width = width
			canvas.height = height
			ctx.drawImage(img, 0, 0, width, height)

			// 二分搜尋最佳品質
			let lo = 0.3, hi = 0.9
			let bestBlob: Blob | null = null

			const tryCompress = (quality: number): Promise<Blob> => {
				return new Promise((resolve) => {
					canvas.toBlob((blob) => {
						resolve(blob!)
					}, 'image/jpeg', quality)
				})
			}

			const findBestQuality = async () => {
				// 先嘗試不同品質
				for (let i = 0; i < 8; i++) {
					const q = (lo + hi) / 2
					const blob = await tryCompress(q)
					if (blob.size <= maxBytes) {
						bestBlob = blob
						lo = q
					} else {
						hi = q
					}
				}

				// 如果還是太大，降低解析度
				if (!bestBlob || bestBlob.size > maxBytes) {
					for (let step = 0; step < 3; step++) {
						width = Math.max(1, Math.round(width * 0.8))
						height = Math.max(1, Math.round(height * 0.8))
						canvas.width = width
						canvas.height = height
						ctx.drawImage(img, 0, 0, width, height)
						
						const blob = await tryCompress(0.7)
						if (blob.size <= maxBytes) {
							bestBlob = blob
							break
						}
					}
				}

				if (!bestBlob) {
					bestBlob = await tryCompress(0.3)
				}

				const nameBase = file.name.replace(/\.[^.]+$/, '') || 'invitation'
				resolve({
					blob: bestBlob,
					filename: `${nameBase}_compressed.jpg`
				})
			}

			findBestQuality().catch(reject)
		}
		img.onerror = reject
		img.src = URL.createObjectURL(file)
	})
}

interface InvitationUploadProps {
	cardType: string
}

export default function InvitationUpload({ cardType }: InvitationUploadProps) {
	const [uploading, setUploading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const router = useRouter()

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		// 檢查檔案類型
		if (!file.type.startsWith('image/')) {
			setError('請上傳圖片檔案')
			return
		}

		setUploading(true)
		setError(null)

		try {
			let finalFile = file
			let wasCompressed = false

			// 如果檔案大於 1MB，進行壓縮
			if (file.size > MAX_SIZE) {
				const { blob, filename } = await compressImage(file)
				finalFile = new File([blob], filename, { type: 'image/jpeg' })
				wasCompressed = true
			}

			// 上傳檔案
			const formData = new FormData()
			formData.append('file', finalFile)
			formData.append('cardType', cardType)

			const response = await fetch('/api/admin/upload-invitation-card', {
				method: 'POST',
				body: formData
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || '上傳失敗')
			}

			// 顯示成功訊息
			if (wasCompressed) {
				alert(`上傳成功！檔案已自動壓縮至 ${Math.round(finalFile.size / 1024)}KB`)
			}

			// 刷新頁面
			router.refresh()
		} catch (err) {
			setError(err instanceof Error ? err.message : '上傳失敗')
		} finally {
			setUploading(false)
			// 清空 input
			e.target.value = ''
		}
	}

	return (
		<div className="space-y-3">
			<input 
				type="file" 
				accept="image/*" 
				onChange={handleFileSelect}
				disabled={uploading}
				className="w-full text-sm px-2"
			/>
			{uploading && (
				<div className="text-sm text-blue-600 font-medium">
					📤 上傳中，請稍候...
				</div>
			)}
			{error && (
				<div className="text-sm text-red-600">
					❌ {error}
				</div>
			)}
			<div className="text-xs text-gray-500">
				💡 檔案限制：1MB內，超過自動壓縮
			</div>
		</div>
	)
}
