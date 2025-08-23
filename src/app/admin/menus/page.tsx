import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

export default async function MenuManagePage() {
	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const canManage = roles.includes('admin') || roles.includes('menu_manager')
	if (!canManage) redirect('/hall')

	// 取得所有活動及其餐點設定
	const events = await prisma.event.findMany({
		include: {
			eventMenu: true,
			registrations: {
				select: { id: true }
			}
		},
		orderBy: { startAt: 'desc' }
	})

	// 設定活動餐點
	async function updateEventMenu(formData: FormData) {
		'use server'
		const eventId = String(formData.get('eventId') || '')
		const hasMealService = formData.get('hasMealService') === 'on'
		const allowMealChoice = formData.get('allowMealChoice') === 'on'
		const mealCodeA = formData.get('mealCodeA') as string || null
		const mealCodeB = formData.get('mealCodeB') as string || null
		const mealCodeC = formData.get('mealCodeC') as string || null
		const mealAHasBeef = formData.get('mealAHasBeef') === 'on'
		const mealAHasPork = formData.get('mealAHasPork') === 'on'
		const mealBHasBeef = formData.get('mealBHasBeef') === 'on'
		const mealBHasPork = formData.get('mealBHasPork') === 'on'

		if (!eventId) return

		// 使用upsert來建立或更新活動餐點設定
		await prisma.eventMenu.upsert({
			where: { eventId },
			update: {
				hasMealService,
				allowMealChoice,
				mealCodeA,
				mealCodeB,
				mealCodeC,
				mealAHasBeef,
				mealAHasPork,
				mealBHasBeef,
				mealBHasPork
			},
			create: {
				eventId,
				hasMealService,
				allowMealChoice,
				mealCodeA,
				mealCodeB,
				mealCodeC,
				mealAHasBeef,
				mealAHasPork,
				mealBHasBeef,
				mealBHasPork
			}
		})

		revalidatePath('/admin/menus')
	}



	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">活動餐點管理</h1>
				<div className="flex gap-2">
					<Button as={Link} href="/admin/permissions" variant="outline">權限管理</Button>
					<Button as={Link} href="/group" variant="ghost">返回小組管理</Button>
				</div>
			</div>

			<p className="text-gray-600">管理所有活動的餐點設定，方便講師預約時判斷餐點。</p>

			{/* 活動列表 */}
			<div className="space-y-4">
				{events.map(event => (
					<div key={event.id} className="bg-white border rounded-lg p-6">
						<div className="flex items-start justify-between mb-4">
							<div className="flex-1">
								<h3 className="text-lg font-medium">{event.title}</h3>
								<p className="text-sm text-gray-600">
									{new Date(event.startAt).toLocaleDateString('zh-TW')} {event.location}
								</p>
								<p className="text-sm text-gray-500">
									報名人數：{event.registrations.length} 人
								</p>
							</div>
							<div className="flex items-center gap-2">
								{event.eventMenu?.hasMealService ? (
									<span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
										已設定餐點
									</span>
								) : (
									<span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
										未設定餐點
									</span>
								)}
								<Button
									onClick={() => {
										const modal = document.getElementById(`menu-modal-${event.id}`) as HTMLDialogElement
										if (modal) modal.showModal()
									}}
									variant="outline"
									size="sm"
								>
									{event.eventMenu?.hasMealService ? '編輯餐點' : '設定餐點'}
								</Button>
							</div>
						</div>

						{/* 餐點設定對話框 */}
						<dialog id={`menu-modal-${event.id}`} className="modal">
							<div className="modal-box max-w-2xl">
								<h3 className="font-bold text-lg mb-4">設定餐點 - {event.title}</h3>

								<form action={updateEventMenu} className="space-y-4">
									<input type="hidden" name="eventId" value={event.id} />

									<label className="flex items-center gap-2">
										<input
											type="checkbox"
											name="hasMealService"
											defaultChecked={event.eventMenu?.hasMealService || false}
										/>
										<span>提供餐點服務</span>
									</label>

									<div className="ml-6 space-y-4">
										<label className="flex items-center gap-2">
											<input
												type="checkbox"
												name="allowMealChoice"
												defaultChecked={event.eventMenu?.allowMealChoice ?? true}
											/>
											<span>允許參加者選擇餐點</span>
										</label>

										{/* A餐點設定 */}
										<div className="border rounded p-3 space-y-2">
											<label className="block">
												<span className="font-medium">A餐點名稱</span>
												<input
													type="text"
													name="mealCodeA"
													defaultValue={event.eventMenu?.mealCodeA || ''}
													placeholder="例：薄皮嫩雞"
													className="w-full mt-1 p-2 border rounded"
												/>
											</label>
											<div className="flex gap-4">
												<label className="flex items-center gap-2">
													<input
														type="checkbox"
														name="mealAHasBeef"
														defaultChecked={event.eventMenu?.mealAHasBeef || false}
													/>
													<span>含牛肉</span>
												</label>
												<label className="flex items-center gap-2">
													<input
														type="checkbox"
														name="mealAHasPork"
														defaultChecked={event.eventMenu?.mealAHasPork || false}
													/>
													<span>含豬肉</span>
												</label>
											</div>
										</div>

										{/* B餐點設定 */}
										<div className="border rounded p-3 space-y-2">
											<label className="block">
												<span className="font-medium">B餐點名稱</span>
												<input
													type="text"
													name="mealCodeB"
													defaultValue={event.eventMenu?.mealCodeB || ''}
													placeholder="例：宮保雞丁"
													className="w-full mt-1 p-2 border rounded"
												/>
											</label>
											<div className="flex gap-4">
												<label className="flex items-center gap-2">
													<input
														type="checkbox"
														name="mealBHasBeef"
														defaultChecked={event.eventMenu?.mealBHasBeef || false}
													/>
													<span>含牛肉</span>
												</label>
												<label className="flex items-center gap-2">
													<input
														type="checkbox"
														name="mealBHasPork"
														defaultChecked={event.eventMenu?.mealBHasPork || false}
													/>
													<span>含豬肉</span>
												</label>
											</div>
										</div>

										{/* C餐點設定 */}
										<div className="border rounded p-3 space-y-2">
											<label className="block">
												<span className="font-medium">C餐點名稱 (素食)</span>
												<input
													type="text"
													name="mealCodeC"
													defaultValue={event.eventMenu?.mealCodeC || ''}
													placeholder="例：素食"
													className="w-full mt-1 p-2 border rounded"
												/>
											</label>
											<p className="text-sm text-gray-600">C餐點預設為素食選項</p>
										</div>
									</div>

									<div className="flex justify-end gap-2 mt-6">
										<Button
											type="button"
											variant="ghost"
											onClick={() => {
												const modal = document.getElementById(`menu-modal-${event.id}`) as HTMLDialogElement
												if (modal) modal.close()
											}}
										>
											取消
										</Button>
										<Button type="submit">儲存設定</Button>
									</div>
								</form>
							</div>
						</dialog>
					</div>
				))}
			</div>
		</div>
	)
}
