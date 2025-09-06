'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface GalleryUploadProps {
	imageType: 'mobile' | 'desktop'
	currentImages: string[]
	maxImages: number
}

export default function GalleryUpload({ imageType, currentImages, maxImages }: GalleryUploadProps) {
	const [uploading, setUploading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const router = useRouter()

	const canUploadMore = currentImages.length < maxImages

	// 壓縮圖片函數
	const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number = 0.8): Promise<Blob> => {
		return new Promise((resolve, reject) => {
			const canvas = document.createElement('canvas')
			const ctx = canvas.getContext('2d')!
			const img = new Image()
			
			img.onload = () => {
				// 計算新尺寸，保持比例
				let { width, height } = img
				if (width > maxWidth || height > maxHeight) {
					const ratio = Math.min(maxWidth / width, maxHeight / height)
					width *= ratio
					height *= ratio
				}
				
				canvas.width = width
				canvas.height = height
				
				// 繪製並壓縮
				ctx.drawImage(img, 0, 0, width, height)
				canvas.toBlob((blob) => {
					if (blob) {
						resolve(blob)
					} else {
						reject(new Error('圖片壓縮失敗'))
					}
				}, 'image/jpeg', quality)
			}
			
			img.onerror = () => reject(new Error('圖片載入失敗'))
			img.src = URL.createObjectURL(file)
		})
	}

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || [])
		if (files.length === 0) return

		// 檢查是否超過上限
		if (currentImages.length + files.length > maxImages) {
			setError(`最多只能上傳 ${maxImages} 張圖片`)
			return
		}

		setUploading(true)
		setError(null)

		try {
			for (const file of files) {
				// 檢查檔案類型
				if (!file.type.startsWith('image/')) {
					setError('請選擇圖片檔案')
					continue
				}

				// 檢查檔案大小（原始檔案 10MB 限制）
				if (file.size > 10 * 1024 * 1024) {
					setError('圖片檔案過大，請選擇小於 10MB 的檔案')
					continue
				}

				// 根據類型設定壓縮參數
				const maxWidth = imageType === 'mobile' ? 800 : 1920
				const maxHeight = imageType === 'mobile' ? 1200 : 1080
				
				// 壓縮圖片
				const compressedBlob = await compressImage(file, maxWidth, maxHeight, 0.85)
				
				// 檢查壓縮後大小（2MB 限制）
				if (compressedBlob && compressedBlob.size > 2 * 1024 * 1024) {
					// 如果還是太大，再壓縮一次
					const recompressedBlob = await compressImage(file, maxWidth * 0.8, maxHeight * 0.8, 0.7)
					if (recompressedBlob && recompressedBlob.size > 2 * 1024 * 1024) {
						setError('圖片壓縮後仍然過大，請選擇較小的圖片')
						continue
					}
				}

				// 上傳圖片
				const formData = new FormData()
				formData.append('file', compressedBlob || file)
				formData.append('imageType', imageType)

				const response = await fetch('/api/admin/upload-gallery-image', {
					method: 'POST',
					body: formData
				})

				if (!response.ok) {
					const errorData = await response.json()
					throw new Error(errorData.error || '上傳失敗')
				}
			}

			// 重新載入頁面
			router.refresh()
		} catch (error) {
			console.error('Upload error:', error)
			setError(error instanceof Error ? error.message : '上傳失敗')
		} finally {
			setUploading(false)
			// 清空 input
			e.target.value = ''
		}
	}

	return (
		<div className="space-y-4">
			{error && (
				<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
					{error}
				</div>
			)}

			{canUploadMore && (
				<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
					<input
						type="file"
						accept="image/*"
						multiple
						onChange={handleFileSelect}
						disabled={uploading}
						className="hidden"
						id={`upload-${imageType}`}
					/>
					<label
						htmlFor={`upload-${imageType}`}
						className={`cursor-pointer ${uploading ? 'opacity-50' : ''}`}
					>
						<div className="space-y-2">
							<div className="text-4xl">📷</div>
							<div className="text-lg font-medium">
								{uploading ? '上傳中...' : `上傳${imageType === 'mobile' ? '手機版' : '電腦版'}圖片`}
							</div>
							<div className="text-sm text-gray-500">
								點擊選擇圖片，或拖拽圖片到此處
								<br />
								建議尺寸：{imageType === 'mobile' ? '9:16 或 3:4 比例' : '16:9 或 4:3 比例'}
								<br />
								支援 JPG、PNG 格式，單張限制 2MB
							</div>
						</div>
					</label>
				</div>
			)}

			{!canUploadMore && (
				<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm text-center">
					已達到最大圖片數量限制（{maxImages} 張）
				</div>
			)}
		</div>
	)
}
