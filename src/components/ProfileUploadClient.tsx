"use client"

import React, { useState } from 'react'
import NextImage from 'next/image'
import { upload } from '@vercel/blob/client'

const TARGET_MAX_BYTES = 500 * 1024

async function blobFromCanvas(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality)
	})
}

async function loadImage(file: File): Promise<HTMLImageElement> {
	const url = URL.createObjectURL(file)
	try {
		const img = await new Promise<HTMLImageElement>((resolve, reject) => {
			const i = new window.Image()
			i.onload = () => resolve(i)
			i.onerror = reject as OnErrorEventHandler
			i.src = url
		})
		return img
	} finally {
		URL.revokeObjectURL(url)
	}
}

async function compressImageToTarget(file: File, maxBytes = TARGET_MAX_BYTES): Promise<{ blob: Blob; filename: string }> {
	const img = await loadImage(file)
	// 初始縮放：限制最長邊約 2000px，避免超大解析度
	const maxDim = 2000
	const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
	let width = Math.max(1, Math.round(img.width * scale))
	let height = Math.max(1, Math.round(img.height * scale))
	const canvas = document.createElement('canvas')
	const ctx = canvas.getContext('2d')!
	canvas.width = width
	canvas.height = height
	ctx.drawImage(img, 0, 0, width, height)

	// 先用 WEBP，再退回 JPEG
	let type = 'image/webp'
	let lo = 0.4, hi = 0.9, result: Blob | null = null
	for (let iter = 0; iter < 8; iter++) {
		const q = (lo + hi) / 2
		const b = await blobFromCanvas(canvas, type, q)
		if (b.size <= maxBytes) {
			result = b
			hi = q
		} else {
			lo = q
		}
	}
	if (!result || result.size > maxBytes) {
		// 嘗試降解析度再壓一輪
		for (let step = 0; step < 3 && (!result || result.size > maxBytes); step++) {
			width = Math.max(1, Math.round(width * 0.85))
			height = Math.max(1, Math.round(height * 0.85))
			canvas.width = width
			canvas.height = height
			ctx.drawImage(img, 0, 0, width, height)
			lo = 0.4; hi = 0.9; result = null
			for (let iter = 0; iter < 8; iter++) {
				const q = (lo + hi) / 2
				const b = await blobFromCanvas(canvas, type, q)
				if (b.size <= maxBytes) { result = b; hi = q } else { lo = q }
			}
		}
	}
	if (!result || result.size > maxBytes) {
		// 改用 JPEG 再試一次
		type = 'image/jpeg'
		lo = 0.4; hi = 0.9; result = null
		for (let iter = 0; iter < 8; iter++) {
			const q = (lo + hi) / 2
			const b = await blobFromCanvas(canvas, type, q)
			if (b.size <= maxBytes) { result = b; hi = q } else { lo = q }
		}
	}
	const ext = type === 'image/webp' ? 'webp' : 'jpg'
	const nameBase = (file.name.replace(/\.[^.]+$/, '') || 'img')
	return { blob: result || (await blobFromCanvas(canvas, type, 0.8)), filename: `${nameBase}.${ext}` }
}

function PreviewGrid({ urls }: { urls: string[] }) {
	if (urls.length === 0) return null
	return (
		<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
			{urls.map((u) => (
				<div key={u} className="relative w-full aspect-[4/3] overflow-hidden rounded border">
					<NextImage src={u} alt="uploaded" fill className="object-cover" />
				</div>
			))}
		</div>
	)
}

export default function ProfileUploadClient({ type = 'both' }: { type?: 'cards' | 'photos' | 'both' }) {
	const [cardUrls, setCardUrls] = useState<string[]>([])
	const [photoUrls, setPhotoUrls] = useState<string[]>([])
	const [busy, setBusy] = useState(false)

	async function onSelectCards(e: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(e.target.files || [])
		if (!files.length) return
		setBusy(true)
		try {
			const results = await Promise.all(
				files.map(async (f) => {
					if (!f.type.startsWith('image/')) {
						alert(`僅限上傳圖片，已略過：${f.name}`)
						return null
					}
					const { blob, filename } = await compressImageToTarget(f, TARGET_MAX_BYTES)
					const { url } = await upload(filename, new File([blob], filename, { type: blob.type }), { access: 'public', handleUploadUrl: '/api/upload' })
					return url
				})
			)
			setCardUrls((prev) => [...prev, ...results.filter(Boolean) as string[]])
		} finally {
			setBusy(false)
		}
	}

	async function onSelectPhotos(e: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(e.target.files || [])
		if (!files.length) return
		setBusy(true)
		try {
			const results = await Promise.all(
				files.map(async (f) => {
					if (f.type.startsWith('image/')) {
						const { blob, filename } = await compressImageToTarget(f, TARGET_MAX_BYTES)
						const { url } = await upload(filename, new File([blob], filename, { type: blob.type }), { access: 'public', handleUploadUrl: '/api/upload' })
						return url
					} else {
						if (f.size > TARGET_MAX_BYTES) {
							alert(`檔案過大（>${Math.round(TARGET_MAX_BYTES/1024)}KB）：${f.name}`)
							return null
						}
						const { url } = await upload(f.name, f, { access: 'public', handleUploadUrl: '/api/upload' })
						return url
					}
				})
			)
			setPhotoUrls((prev) => [...prev, ...results.filter(Boolean) as string[]])
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className="space-y-4">
			{(type === 'cards' || type === 'both') && (
				<div className="space-y-2">
					<label className="block text-sm font-medium">選擇名片圖片</label>
					<input type="file" multiple accept="image/*" onChange={onSelectCards} className="text-sm" />
					{cardUrls.map((u) => (
						<input key={u} type="hidden" name="cardUrls" value={u} />
					))}
					<PreviewGrid urls={cardUrls} />
				</div>
			)}

			{(type === 'photos' || type === 'both') && (
				<div className="space-y-2">
					<label className="block text-sm font-medium">選擇作品照片</label>
					<input type="file" multiple accept="image/*" onChange={onSelectPhotos} className="text-sm" />
					{photoUrls.map((u) => (
						<input key={u} type="hidden" name="photoUrls" value={u} />
					))}
					<PreviewGrid urls={photoUrls} />
				</div>
			)}

			{busy && <div className="text-xs text-gray-500">上傳中…請稍候</div>}
		</div>
	)
}
