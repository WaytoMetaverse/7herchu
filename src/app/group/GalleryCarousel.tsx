'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface GalleryCarouselProps {
	mobileImages: string[]
	desktopImages: string[]
}

export default function GalleryCarousel({ mobileImages, desktopImages }: GalleryCarouselProps) {
	const [currentIndex, setCurrentIndex] = useState(0)
	const [isMobile, setIsMobile] = useState(false)

	// 檢測裝置類型
	useEffect(() => {
		const checkDevice = () => {
			setIsMobile(window.innerWidth < 768)
		}
		
		checkDevice()
		window.addEventListener('resize', checkDevice)
		return () => window.removeEventListener('resize', checkDevice)
	}, [])

	// 選擇對應的圖片陣列
	const images = isMobile ? mobileImages : desktopImages
	
	// 自動輪播
	useEffect(() => {
		if (!images || images.length <= 1) return

		const timer = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % images.length)
		}, 5000) // 5秒切換一次

		return () => clearInterval(timer)
	}, [images])

	// 如果沒有圖片，不顯示輪播
	if (!images || images.length === 0) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
				<div className="text-center space-y-4">
					<div className="text-6xl">🏠</div>
					<h1 className="text-3xl font-bold text-gray-800">磐石砌好厝</h1>
					<p className="text-gray-600">歡迎來到我們的小組</p>
				</div>
			</div>
		)
	}

	const goToPrevious = () => {
		setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
	}

	const goToNext = () => {
		setCurrentIndex((prev) => (prev + 1) % images.length)
	}

	const goToSlide = (index: number) => {
		setCurrentIndex(index)
	}

	return (
		<div className="min-h-screen relative overflow-hidden bg-black">
			{/* 圖片容器 */}
			<div className="relative w-full h-screen">
				{images.map((image, index) => (
					<div
						key={image}
						className={`absolute inset-0 transition-opacity duration-1000 ${
							index === currentIndex ? 'opacity-100' : 'opacity-0'
						}`}
					>
						<img
							src={image}
							alt={`小組展示圖片 ${index + 1}`}
							className="w-full h-full object-cover"
						/>
						{/* 圖片遮罩 */}
						<div className="absolute inset-0 bg-black bg-opacity-20" />
					</div>
				))}
			</div>

			{/* 標題覆蓋層 */}
			<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
				<div className="text-center text-white space-y-4 px-4">
					<h1 className="text-4xl md:text-6xl font-bold drop-shadow-lg">
						磐石砌好厝
					</h1>
					<p className="text-lg md:text-xl drop-shadow-md opacity-90">
						歡迎來到我們的小組
					</p>
				</div>
			</div>

			{/* 導航按鈕 */}
			{images.length > 1 && (
				<>
					<button
						onClick={goToPrevious}
						className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-all duration-200 backdrop-blur-sm"
						aria-label="上一張圖片"
					>
						<ChevronLeft className="w-6 h-6" />
					</button>
					<button
						onClick={goToNext}
						className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-all duration-200 backdrop-blur-sm"
						aria-label="下一張圖片"
					>
						<ChevronRight className="w-6 h-6" />
					</button>
				</>
			)}

			{/* 指示點 */}
			{images.length > 1 && (
				<div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2">
					{images.map((_, index) => (
						<button
							key={index}
							onClick={() => goToSlide(index)}
							className={`w-3 h-3 rounded-full transition-all duration-200 ${
								index === currentIndex
									? 'bg-white'
									: 'bg-white bg-opacity-50 hover:bg-opacity-75'
							}`}
							aria-label={`跳到第 ${index + 1} 張圖片`}
						/>
					))}
				</div>
			)}

			{/* 登入提示 */}
			<div className="absolute bottom-4 right-4">
				<a
					href="/auth/signin"
					className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-all duration-200 text-sm"
				>
					成員登入
				</a>
			</div>
		</div>
	)
}
