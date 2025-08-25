import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export default async function EventRegisterPage({ params }: { params: Promise<{ id: string }> }) {
	try {
		const { id: eventId } = await params
		console.log('Event ID:', eventId)
		
		const session = await getServerSession(authOptions)
		console.log('Session:', session ? 'exists' : 'null')
		if (!session?.user?.email) redirect('/auth/signin')

		const event = await prisma.event.findUnique({ where: { id: eventId } })
		console.log('Event:', event ? 'found' : 'not found')
		if (!event) notFound()

		const user = await prisma.user.findUnique({ 
			where: { email: session.user.email },
			include: { memberProfile: true }
		})
		console.log('User:', user ? 'found' : 'not found', 'Phone:', user?.phone)
		if (!user) redirect('/auth/signin')

		// 檢查是否已報名
		const existingReg = user.phone ? await prisma.registration.findUnique({
			where: { eventId_phone: { eventId, phone: user.phone } }
		}) : null
		console.log('Existing registration:', existingReg ? 'found' : 'not found')

		// 取得活動餐點設定
		const eventMenu = await prisma.eventMenu.findUnique({
			where: { eventId }
		})
		console.log('Event menu:', eventMenu ? 'found' : 'not found')

	// 處理報名
	async function submitRegistration(formData: FormData) {
		'use server'
		if (!user) return
		
		const mealCode = String(formData.get('mealCode') || '')
		const noBeef = formData.get('noBeef') === 'on'
		const noPork = formData.get('noPork') === 'on'

		// 智能餐點選擇邏輯
		let diet = 'meat'
		let finalMealCode = mealCode
		
		if (!mealCode && eventMenu?.hasMealService) {
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
		} else if (!mealCode && !eventMenu?.hasMealService) {
			// 沒有設定餐點時，根據飲食偏好設定
			diet = noBeef && noPork ? 'veg' : 'meat'
		}

		// 如果已報名則更新，否則新增
		if (existingReg) {
			await prisma.registration.update({
				where: { id: existingReg.id },
				data: {
					mealCode: finalMealCode,
					diet,
					noBeef,
					noPork
				}
			})
		} else {
			await prisma.registration.create({
				data: {
					eventId,
					userId: user.id,
					role: 'MEMBER',
					name: user.name || '',
					phone: user.phone || '',
					mealCode: finalMealCode,
					diet,
					noBeef,
					noPork,
					paymentStatus: 'UNPAID'
				}
			})
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

			<form action={submitRegistration} className="space-y-6">
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
										</div>
										<div className="text-gray-700">{eventMenu.mealCodeA}</div>
										<div className="text-xs text-gray-500 mt-1 space-x-2">
											{eventMenu.mealAHasBeef && <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded">含牛</span>}
											{eventMenu.mealAHasPork && <span className="px-1 py-0.5 bg-orange-100 text-orange-600 rounded">含豬</span>}
										</div>
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
										</div>
										<div className="text-gray-700">{eventMenu.mealCodeB}</div>
										<div className="text-xs text-gray-500 mt-1 space-x-2">
											{eventMenu.mealBHasBeef && <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded">含牛</span>}
											{eventMenu.mealBHasPork && <span className="px-1 py-0.5 bg-orange-100 text-orange-600 rounded">含豬</span>}
										</div>
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
							此活動未提供餐點服務
						</div>
					)}
				</div>

				{/* 飲食偏好 - 只在沒有餐點服務時顯示 */}
				{!eventMenu?.hasMealService && (
					<div>
						<h3 className="font-medium mb-3">飲食偏好</h3>
						<div className="space-y-2">
							<label className="flex items-center gap-2">
								<input 
									type="checkbox" 
									name="noBeef" 
									defaultChecked={existingReg?.noBeef || false}
								/>
								<span className="text-sm">不吃牛肉</span>
							</label>
							<label className="flex items-center gap-2">
								<input 
									type="checkbox" 
									name="noPork" 
									defaultChecked={existingReg?.noPork || false}
								/>
								<span className="text-sm">不吃豬肉</span>
							</label>
						</div>
					</div>
				)}

				<div className="flex items-center gap-3">
					<Button type="submit" variant="primary">
						{existingReg ? '更新報名' : '送出報名'}
					</Button>
					<Button as={Link} href={`/hall/${eventId}`} variant="ghost">取消</Button>
				</div>
			</form>


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
