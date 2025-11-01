import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { pushSolonByEvent } from '@/lib/line'
import { sendRegistrationNotification, getDisplayName } from '@/lib/notificationHelper'
import { generateSolonMessage } from '@/lib/solon'
import RegisterForm from './RegisterForm'

export default async function EventRegisterPage({ params }: { params: Promise<{ id: string }> }) {
	try {
		console.log('=== EventRegisterPage Start ===')
		
		// 1. 檢查環境變數
		console.log('NODE_ENV:', process.env.NODE_ENV)
		console.log('NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET)
		console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
		console.log('GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID)
		console.log('GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET)
		
		// 2. 解析參數
		const { id: eventId } = await params
		console.log('Event ID:', eventId)
		
		// 3. 檢查會話
		console.log('Getting session...')
		let session
		try {
			session = await getServerSession(authOptions)
			console.log('Session:', session ? 'exists' : 'null')
			if (!session?.user?.email) redirect('/auth/signin')
		} catch (sessionError) {
			console.error('Session error:', sessionError)
			throw new Error(`Session error: ${sessionError}`)
		}

		const event = await prisma.event.findUnique({ where: { id: eventId } })
		console.log('Event:', event ? 'found' : 'not found')
		if (!event) notFound()

		const user = await prisma.user.findUnique({ 
			where: { email: session.user.email },
			include: { memberProfile: true }
		})
		console.log('User:', user ? 'found' : 'not found', 'Phone:', user?.phone)
		if (!user) redirect('/auth/signin')

		// 檢查是否已報名（以 userId 或 phone 任一，且限定 MEMBER 身分）
		const existingReg = await prisma.registration.findFirst({
			where: {
				eventId,
				role: 'MEMBER',
				OR: [
					{ userId: user.id },
					...(user.phone ? [{ phone: user.phone }] as Array<{ phone: string }> : [])
				]
			},
			orderBy: { createdAt: 'asc' }
		})
		console.log('Existing registration (member):', existingReg ? 'found' : 'not found')

		// 取得活動餐點設定
		const eventMenu = await prisma.eventMenu.findUnique({
			where: { eventId }
		})
		console.log('Event menu:', eventMenu ? 'found' : 'not found')

	// 處理報名
	async function submitRegistration(formData: FormData) {
		'use server'
		if (!user) return
		
		// 防重複提交：使用資料庫事務確保原子性
		const result = await prisma.$transaction(async (tx) => {
		
		const mealCode = String(formData.get('mealCode') || '')
		const noBeef = formData.get('noBeef') === 'on'
		const noPork = formData.get('noPork') === 'on'
		const dietFromForm = String(formData.get('diet') || 'meat')

		// 智能餐點選擇邏輯
		let diet = dietFromForm
		let finalMealCode = mealCode
		
		// 安全地檢查 eventMenu 是否存在
		if (eventMenu && eventMenu.hasMealService) {
			if (!mealCode) {
				// 沒有選擇餐點，但有設定餐點服務，進行智能選擇
				if (noBeef && noPork) {
					// 不吃牛也不吃豬 → 選素食 C
					finalMealCode = 'C'
					diet = 'veg'
				} else {
					// 葷食，需要智能選擇 A 或 B
					const canEatA = !(noBeef && eventMenu.mealAHasBeef) && !(noPork && eventMenu.mealAHasPork)
					const canEatB = !(noBeef && eventMenu.mealBHasBeef) && !(noPork && eventMenu.mealBHasPork)
					
					if (canEatA && canEatB) {
						// 兩個都可以吃，選擇人數較少的（這裡先選A，之後可以優化）
						finalMealCode = 'A'
					} else if (canEatA) {
						finalMealCode = 'A'
					} else if (canEatB) {
						finalMealCode = 'B'
					} else {
						// 都不能吃，選素食 C
						finalMealCode = 'C'
						diet = 'veg'
					}
				}
			} else if (mealCode === 'C') {
				diet = 'veg' // C餐點預設為素食
			}
		} else {
			// 沒有設定餐點時，使用表單提交的飲食偏好
			diet = dietFromForm
			// 沒有餐點設定時，finalMealCode 保持為空字串
		}

			// Server Action 內再查一次，避免前後態或併發造成重複建立
			// 支援 MEMBER 和 SPEAKER 角色（內部成員講師也可以報名）
			const prevReg = await tx.registration.findFirst({
				where: {
					eventId,
					role: { in: ['MEMBER', 'SPEAKER'] },
					OR: [
						{ userId: user.id },
						...(user.phone ? [{ phone: user.phone }] as Array<{ phone: string }> : [])
					]
				},
				orderBy: { createdAt: 'asc' }
			})

			if (prevReg) {
				// 更新現有報名
				const updatedReg = await tx.registration.update({
					where: { id: prevReg.id },
					data: {
						mealCode: finalMealCode,
						diet,
						noBeef,
						noPork,
						status: 'REGISTERED',
						// 如果之前是講師，保持講師身份；否則設為成員
						role: prevReg.role === 'SPEAKER' ? 'SPEAKER' : 'MEMBER'
					}
				})
				return { isNewRegistration: false, registration: updatedReg }
			} else {
				// 創建新報名
				const newReg = await tx.registration.create({
					data: {
						eventId,
						userId: user.id,
						role: 'MEMBER',
						name: user.name || '',
						...(user.phone ? { phone: user.phone } : {}),
						mealCode: finalMealCode,
						diet,
						noBeef,
						noPork,
						status: 'REGISTERED',
						paymentStatus: 'UNPAID'
					}
				})
				return { isNewRegistration: true, registration: newReg }
			}
		})

		// 只有新報名時才發送通知
		if (result.isNewRegistration) {
			// 發送推送通知
			try {
				const displayName = getDisplayName(user, user.name)
				await sendRegistrationNotification(eventId, displayName, 'MEMBER')
			} catch (e) {
				console.warn('[register] sendPushNotification failed', { eventId, err: (e as Error)?.message })
			}

			// 推送接龍訊息
			try {
				await pushSolonByEvent(eventId, generateSolonMessage)
			} catch (e) {
				console.warn('[register] pushSolonByEvent failed', { eventId, err: (e as Error)?.message })
			}
		}

		revalidatePath(`/hall/${eventId}`)
		redirect(`/hall/${eventId}`)
	}

	return (
		<div className="max-w-lg mx-auto p-4 space-y-6">
			<div className="text-center space-y-2">
				<h1 className="text-2xl font-semibold">活動報名</h1>
				<div className="text-gray-600">
					<div className="font-medium">{event.title}</div>
					<div className="text-sm">
						{format(event.startAt, 'yyyy/MM/dd（EEEEE） HH:mm', { locale: zhTW })}
					</div>
					<div className="text-sm">{event.location}</div>
				</div>
			</div>

			{existingReg && (
				<div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
					您已報名此活動，可以修改菜單選擇。
				</div>
			)}

			<RegisterForm action={submitRegistration} existingReg={existingReg}>
				<div>
					<h2 className="font-medium mb-4">菜單選擇</h2>
					{eventMenu?.hasMealService ? (
						<div className="space-y-3">
							{/* A餐點選項 */}
							{eventMenu.mealCodeA && (
								<label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
									<input
										type="radio"
										name="mealCode"
										value="A"
										defaultChecked={existingReg?.mealCode === 'A'}
										required
										className="mt-1"
									/>
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-1">
											<span className="font-medium">選項 A</span>
											{eventMenu.mealAHasBeef && <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded text-xs">含牛</span>}
											{eventMenu.mealAHasPork && <span className="px-1 py-0.5 bg-orange-100 text-orange-600 rounded text-xs">含豬</span>}
										</div>
										<div className="text-gray-700">{eventMenu.mealCodeA}</div>
									</div>
								</label>
							)}

							{/* B餐點選項 */}
							{eventMenu.mealCodeB && (
								<label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
									<input
										type="radio"
										name="mealCode"
										value="B"
										defaultChecked={existingReg?.mealCode === 'B'}
										required
										className="mt-1"
									/>
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-1">
											<span className="font-medium">選項 B</span>
											{eventMenu.mealBHasBeef && <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded text-xs">含牛</span>}
											{eventMenu.mealBHasPork && <span className="px-1 py-0.5 bg-orange-100 text-orange-600 rounded text-xs">含豬</span>}
										</div>
										<div className="text-gray-700">{eventMenu.mealCodeB}</div>
									</div>
								</label>
							)}

							{/* C餐點選項 */}
							{eventMenu.mealCodeC && (
								<label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
									<input
										type="radio"
										name="mealCode"
										value="C"
										defaultChecked={existingReg?.mealCode === 'C'}
										required
										className="mt-1"
									/>
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-1">
											<span className="font-medium">選項 C</span>
											<span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">素食</span>
										</div>
										<div className="text-gray-700">{eventMenu.mealCodeC}</div>
									</div>
								</label>
							)}
						</div>
					) : (
						<div className="text-gray-500 text-center py-8">
							此活動尚未提供餐點更新，<br />
							更新後Ai小助理將依您的飲食偏好選擇
						</div>
					)}
				</div>

				{/* 飲食偏好 - 只在沒有餐點服務時顯示 */}
				{!eventMenu?.hasMealService && (
					<div>
						<h3 className="font-medium mb-3">飲食偏好</h3>
						<div className="space-y-3">
							{/* 葷食/素食選擇 */}
							<div className="flex items-center gap-4">
								<label className="flex items-center gap-2 text-sm">
									<input 
										type="radio" 
										name="diet" 
										value="meat"
										required 
										defaultChecked={
											existingReg?.diet === 'meat' || 
											(!existingReg && user?.memberProfile?.dietPreference === 'meat') ||
											(!existingReg && !user?.memberProfile?.dietPreference)
										}
									/>
									葷食<span className="text-red-500">*</span>
								</label>
								<label className="flex items-center gap-2 text-sm">
									<input 
										type="radio" 
										name="diet" 
										value="veg"
										required 
										defaultChecked={
											existingReg?.diet === 'veg' || 
											(!existingReg && user?.memberProfile?.dietPreference === 'veg')
										}
									/>
									素食<span className="text-red-500">*</span>
								</label>
							</div>
							
							{/* 不吃牛/豬選項 */}
							<div className="flex items-center gap-4 text-sm">
								<label className="flex items-center gap-2">
									<input 
										type="checkbox" 
										name="noBeef" 
										defaultChecked={existingReg?.noBeef || false}
									/>
									不吃牛
								</label>
								<label className="flex items-center gap-2">
									<input 
										type="checkbox" 
										name="noPork" 
										defaultChecked={existingReg?.noPork || false}
									/>
									不吃豬
								</label>
							</div>
						</div>
					</div>
				)}

				<div className="flex items-center gap-3">
					<Button type="submit" variant="primary">
						{existingReg ? '更新報名' : '送出報名'}
					</Button>
					<Button as={Link} href={`/hall/${eventId}`} variant="ghost">取消</Button>
				</div>
			</RegisterForm>


		</div>
	)
	} catch (error) {
		console.error('EventRegisterPage error:', error)
		
		// 在開發環境顯示詳細錯誤信息
		const isDev = process.env.NODE_ENV === 'development'
		
		return (
			<div className="max-w-lg mx-auto p-4 space-y-6">
				<div className="text-center space-y-2">
					<h1 className="text-2xl font-semibold text-red-600">載入錯誤</h1>
					<p className="text-gray-600">抱歉，載入報名頁面時發生錯誤。</p>
					
					{isDev && (
						<div className="bg-red-50 p-3 rounded-lg text-left">
							<p className="text-sm font-medium text-red-800 mb-2">開發環境錯誤詳情：</p>
							<pre className="text-xs text-red-700 whitespace-pre-wrap">
								{error instanceof Error ? error.message : String(error)}
							</pre>
						</div>
					)}
					
					<div className="space-y-2">
						<Button as={Link} href="/hall" variant="primary">返回活動大廳</Button>
						<Button 
							onClick={() => window.location.reload()} 
							variant="ghost"
						>
							重新載入
						</Button>
					</div>
				</div>
			</div>
		)
	}
}
