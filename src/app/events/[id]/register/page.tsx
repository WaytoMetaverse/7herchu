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
	const { id: eventId } = await params
	const session = await getServerSession(authOptions)
	if (!session?.user?.email) redirect('/auth/signin')

	const event = await prisma.event.findUnique({ where: { id: eventId } })
	if (!event) notFound()

	const user = await prisma.user.findUnique({ 
		where: { email: session.user.email },
		include: { memberProfile: true }
	})
	if (!user) redirect('/auth/signin')

	// 檢查是否已報名
	const existingReg = await prisma.registration.findUnique({
		where: { eventId_phone: { eventId, phone: user.phone || '' } }
	})

	// 取得當月菜單
	const eventMonth = new Date(event.startAt).toISOString().slice(0, 7)
	const menu = await prisma.menu.findUnique({
		where: { month: eventMonth },
		include: { items: true }
	})

	// 處理報名
	async function submitRegistration(formData: FormData) {
		'use server'
		if (!user) return
		
		const mealCode = String(formData.get('mealCode') || '')
		const noBeef = formData.get('noBeef') === 'on'
		const noPork = formData.get('noPork') === 'on'

		if (!mealCode) return

		const menuItem = menu?.items.find(item => item.code === mealCode)
		let diet = 'meat'
		if (menuItem?.isVegetarian) diet = 'veg'

		// 如果已報名則更新，否則新增
		if (existingReg) {
			await prisma.registration.update({
				where: { id: existingReg.id },
				data: {
					mealCode,
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
					mealCode,
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
					{menu?.items ? (
						<div className="space-y-3">
							{menu.items.map(item => {
								// 如果用戶個人資料設定為素食，預設選擇 C
								const isVegetarianUser = user.memberProfile?.dietPreference === 'veg'
								const shouldDefault = existingReg?.mealCode === item.code || 
									(!existingReg && isVegetarianUser && item.code === 'C')
								
								return (
									<label key={item.id} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
										<input
											type="radio"
											name="mealCode"
											value={item.code}
											defaultChecked={shouldDefault}
											required
											className="mt-1"
										/>
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-1">
											<span className="font-medium">選項 {item.code}</span>
											{item.isVegetarian && (
												<span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">素食</span>
											)}
										</div>
										<div className="text-gray-700">{item.name}</div>
										{!item.isVegetarian && (
											<div className="text-xs text-gray-500 mt-1 space-x-2">
												{item.containsBeef && <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded">含牛</span>}
												{item.containsPork && <span className="px-1 py-0.5 bg-orange-100 text-orange-600 rounded">含豬</span>}
											</div>
										)}
									</div>
								</label>
								)
							})}
						</div>
					) : (
						<div className="text-gray-500 text-center py-8">
							本月菜單尚未發布
						</div>
					)}
				</div>

				{/* 飲食偏好 */}
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

				<div className="flex items-center gap-3">
					<Button type="submit" variant="primary" disabled={!menu?.items?.length}>
						{existingReg ? '更新報名' : '送出報名'}
					</Button>
					<Button as={Link} href={`/hall/${eventId}`} variant="ghost">取消</Button>
				</div>
			</form>


		</div>
	)
}
