'use client'
import { useState, useEffect } from 'react'
import Button from './ui/Button'

export default function PushNotificationToggle() {
	const [isSupported, setIsSupported] = useState(false)
	const [permission, setPermission] = useState<NotificationPermission>('default')
	const [isSubscribed, setIsSubscribed] = useState(false)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		// 檢查瀏覽器是否支援推送通知
		const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
		setIsSupported(supported)
		
		if (supported) {
			setPermission(Notification.permission)
			checkSubscription()
		} else {
			setIsLoading(false)
		}
	}, [])

	const checkSubscription = async () => {
		try {
			const registration = await navigator.serviceWorker.ready
			const subscription = await registration.pushManager.getSubscription()
			
			if (subscription) {
				// 檢查伺服器端狀態
				const res = await fetch('/api/push/status')
				if (res.ok) {
					const data = await res.json()
					setIsSubscribed(data.hasActiveSubscription)
				}
			} else {
				setIsSubscribed(false)
			}
		} catch (error) {
			console.error('檢查訂閱狀態失敗:', error)
		} finally {
			setIsLoading(false)
		}
	}

	const urlBase64ToUint8Array = (base64String: string) => {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
		const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
		const rawData = window.atob(base64)
		const outputArray = new Uint8Array(rawData.length)
		for (let i = 0; i < rawData.length; ++i) {
			outputArray[i] = rawData.charCodeAt(i)
		}
		return outputArray
	}

	const subscribeToPush = async () => {
		setIsLoading(true)
		try {
			// 請求通知權限
			const result = await Notification.requestPermission()
			setPermission(result)

			if (result !== 'granted') {
				alert('請允許通知權限以接收報名通知')
				setIsLoading(false)
				return
			}

			// 獲取 Service Worker 註冊
			const registration = await navigator.serviceWorker.ready

			// 訂閱推送
			const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
			if (!vapidPublicKey) {
				console.error('VAPID 公鑰未設定')
				alert('推送通知設定錯誤，請聯繫管理員')
				setIsLoading(false)
				return
			}

			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
			})

			// 將訂閱資訊發送到伺服器
			const res = await fetch('/api/push/subscribe', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ subscription })
			})

			if (res.ok) {
				setIsSubscribed(true)
				alert('✅ 推送通知已開啟！您將收到報名通知。')
			} else {
				throw new Error('訂閱失敗')
			}
		} catch (error) {
			console.error('訂閱推送通知失敗:', error)
			alert('開啟推送通知失敗，請稍後再試')
		} finally {
			setIsLoading(false)
		}
	}

	const unsubscribeFromPush = async () => {
		setIsLoading(true)
		try {
			const registration = await navigator.serviceWorker.ready
			const subscription = await registration.pushManager.getSubscription()

			if (subscription) {
				const endpoint = subscription.endpoint
				
				// 通知伺服器取消訂閱
				await fetch('/api/push/unsubscribe', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ endpoint })
				})

				// 取消瀏覽器訂閱
				await subscription.unsubscribe()
			}

			setIsSubscribed(false)
			alert('✅ 推送通知已關閉')
		} catch (error) {
			console.error('取消訂閱失敗:', error)
			alert('關閉推送通知失敗，請稍後再試')
		} finally {
			setIsLoading(false)
		}
	}

	if (!isSupported) {
		return (
			<div className="bg-gray-50 p-4 rounded-lg">
				<p className="text-sm text-gray-600">您的瀏覽器不支援推送通知</p>
			</div>
		)
	}

	return (
		<div className="bg-white border rounded-lg p-4">
			<div className="flex items-start justify-between">
				<div className="flex-1">
					<h3 className="font-medium mb-1">推送通知</h3>
					<p className="text-sm text-gray-600 mb-3">
						開啟後，當有人報名活動時您將收到即時通知
					</p>
					{permission === 'denied' && (
						<p className="text-sm text-red-600 mb-2">
							⚠️ 通知權限已被拒絕，請在瀏覽器設定中允許通知
						</p>
					)}
				</div>
				<div className="ml-4">
					{isLoading ? (
						<div className="text-sm text-gray-500">載入中...</div>
					) : isSubscribed ? (
						<Button
							onClick={unsubscribeFromPush}
							variant="outline"
							size="sm"
							disabled={isLoading}
						>
							關閉通知
						</Button>
					) : (
						<Button
							onClick={subscribeToPush}
							variant="primary"
							size="sm"
							disabled={isLoading || permission === 'denied'}
						>
							開啟通知
						</Button>
					)}
				</div>
			</div>
			{isSubscribed && (
				<div className="mt-3 pt-3 border-t">
					<div className="flex items-center gap-2 text-sm text-green-600">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>推送通知已啟用</span>
					</div>
				</div>
			)}
		</div>
	)
}

