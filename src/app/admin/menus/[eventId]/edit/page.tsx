import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

export default async function EditEventMenuPage({
	params
}: {
	params: Promise<{ eventId: string }>
}) {
	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const canManage = roles.includes('admin') || roles.includes('menu_manager')
	if (!canManage) redirect('/hall')

	const { eventId } = await params

	// 取得活動信息和餐點設定
	const event = await prisma.event.findUnique({
		where: { id: eventId },
		include: {
			eventMenu: true
		}
	})

	if (!event) {
		redirect('/admin/menus')
	}

	// 設定活動餐點
	async function updateEventMenu(formData: FormData) {
		'use server'
		const hasMealService = formData.get('hasMealService') === 'on'
		const allowMealChoice = formData.get('allowMealChoice') === 'on'
		const mealCodeA = formData.get('mealCodeA') as string || null
		const mealCodeB = formData.get('mealCodeB') as string || null
		const mealCodeC = formData.get('mealCodeC') as string || null
		const mealAHasBeef = formData.get('mealAHasBeef') === 'on'
		const mealAHasPork = formData.get('mealAHasPork') === 'on'
		const mealBHasBeef = formData.get('mealBHasBeef') === 'on'
		const mealBHasPork = formData.get('mealBHasPork') === 'on'

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
		redirect('/admin/menus')
	}

	return (
		<div className="max-w-3xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">設定餐點 - {event.title}</h1>
				<Link href="/admin/menus" className="text-blue-600 hover:text-blue-800">
					返回餐點管理
				</Link>
			</div>

			<p className="text-gray-600">
				活動時間：{new Date(event.startAt).toLocaleDateString('zh-TW')} {event.location}
			</p>

			<form action={updateEventMenu} className="space-y-6">
				<div className="bg-white border rounded-lg p-6">
					<label className="flex items-center gap-3 mb-6">
						<input
							type="checkbox"
							name="hasMealService"
							defaultChecked={event.eventMenu?.hasMealService || false}
							className="w-4 h-4"
						/>
						<span className="text-lg font-medium">提供餐點服務</span>
					</label>

					<div className="ml-7 space-y-6">
						<label className="flex items-center gap-3">
							<input
								type="checkbox"
								name="allowMealChoice"
								defaultChecked={event.eventMenu?.allowMealChoice ?? true}
								className="w-4 h-4"
							/>
							<span>允許參加者選擇餐點</span>
						</label>

						{/* A餐點設定 */}
						<div className="border rounded-lg p-4 space-y-3">
							<h3 className="font-medium">A餐點設定</h3>
							<label className="block">
								<span>餐點名稱</span>
								<input
									type="text"
									name="mealCodeA"
									defaultValue={event.eventMenu?.mealCodeA || ''}
									placeholder="例：薄皮嫩雞"
									className="w-full mt-1 p-2 border rounded"
								/>
							</label>
							<div className="flex gap-6">
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										name="mealAHasBeef"
										defaultChecked={event.eventMenu?.mealAHasBeef || false}
										className="w-4 h-4"
									/>
									<span>含牛肉</span>
								</label>
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										name="mealAHasPork"
										defaultChecked={event.eventMenu?.mealAHasPork || false}
										className="w-4 h-4"
									/>
									<span>含豬肉</span>
								</label>
							</div>
						</div>

						{/* B餐點設定 */}
						<div className="border rounded-lg p-4 space-y-3">
							<h3 className="font-medium">B餐點設定</h3>
							<label className="block">
								<span>餐點名稱</span>
								<input
									type="text"
									name="mealCodeB"
									defaultValue={event.eventMenu?.mealCodeB || ''}
									placeholder="例：宮保雞丁"
									className="w-full mt-1 p-2 border rounded"
								/>
							</label>
							<div className="flex gap-6">
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										name="mealBHasBeef"
										defaultChecked={event.eventMenu?.mealBHasBeef || false}
										className="w-4 h-4"
									/>
									<span>含牛肉</span>
								</label>
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										name="mealBHasPork"
										defaultChecked={event.eventMenu?.mealBHasPork || false}
										className="w-4 h-4"
									/>
									<span>含豬肉</span>
								</label>
							</div>
						</div>

						{/* C餐點設定 */}
						<div className="border rounded-lg p-4 space-y-3">
							<h3 className="font-medium">C餐點設定 (素食)</h3>
							<label className="block">
								<span>餐點名稱</span>
								<input
									type="text"
									name="mealCodeC"
									defaultValue={event.eventMenu?.mealCodeC || ''}
									placeholder="例：素食便當"
									className="w-full mt-1 p-2 border rounded"
								/>
							</label>
							<p className="text-sm text-green-600">C餐點預設為素食選項，無需標記牛豬肉</p>
						</div>
					</div>
				</div>

				<div className="flex justify-end gap-3">
					<Link href="/admin/menus">
						<Button type="button" variant="ghost">
							取消
						</Button>
					</Link>
					<Button type="submit">
						儲存餐點設定
					</Button>
				</div>
			</form>
		</div>
	)
}
