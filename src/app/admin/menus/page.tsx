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

	// 取得目前和下個月的菜單
	const currentMonth = new Date().toISOString().slice(0, 7)
	const nextMonth = new Date()
	nextMonth.setMonth(nextMonth.getMonth() + 1)
	const nextMonthStr = nextMonth.toISOString().slice(0, 7)

	const menus = await prisma.menu.findMany({
		where: {
			month: { in: [currentMonth, nextMonthStr] }
		},
		include: { items: true },
		orderBy: { month: 'desc' }
	})

	const currentMenu = menus.find(m => m.month === currentMonth)
	const nextMenu = menus.find(m => m.month === nextMonthStr)

	// 建立下月菜單
	async function createNextMenu(formData: FormData) {
		'use server'
		const itemA = String(formData.get('itemA') || '')
		const itemB = String(formData.get('itemB') || '')
		const itemC = String(formData.get('itemC') || '')
		const aHasBeef = formData.get('aHasBeef') === 'on'
		const aHasPork = formData.get('aHasPork') === 'on'
		const bHasBeef = formData.get('bHasBeef') === 'on'
		const bHasPork = formData.get('bHasPork') === 'on'

		if (!itemA || !itemB || !itemC) return

		// 建立菜單
		const menu = await prisma.menu.create({
			data: {
				month: nextMonthStr,
				published: false
			}
		})

		// 建立菜單項目
		await prisma.menuItem.createMany({
			data: [
				{
					menuId: menu.id,
					code: 'A',
					name: itemA,
					containsBeef: aHasBeef,
					containsPork: aHasPork,
					isVegetarian: false
				},
				{
					menuId: menu.id,
					code: 'B',
					name: itemB,
					containsBeef: bHasBeef,
					containsPork: bHasPork,
					isVegetarian: false
				},
				{
					menuId: menu.id,
					code: 'C',
					name: itemC,
					containsBeef: false,
					containsPork: false,
					isVegetarian: true
				}
			]
		})

		revalidatePath('/admin/menus')
	}

	// 發布菜單
	async function publishMenu(formData: FormData) {
		'use server'
		const menuId = String(formData.get('menuId'))
		if (!menuId) return

		await prisma.menu.update({
			where: { id: menuId },
			data: { published: true }
		})

		revalidatePath('/admin/menus')
	}

	return (
		<div className="max-w-4xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">菜單管理</h1>
				<Button as={Link} href="/group" variant="outline">返回小組管理</Button>
			</div>

			{/* 本月菜單 */}
			<div className="bg-white rounded-lg border p-4">
				<h2 className="font-medium mb-4">本月菜單 ({currentMonth})</h2>
				{currentMenu ? (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{currentMenu.items.map(item => (
							<div key={item.id} className="border rounded-lg p-4">
								<div className="flex items-center justify-between mb-2">
									<span className="font-medium text-lg">選項 {item.code}</span>
									{item.isVegetarian && (
										<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">素食</span>
									)}
								</div>
								<div className="text-gray-700 mb-2">{item.name}</div>
								{!item.isVegetarian && (
									<div className="text-xs text-gray-500 space-x-2">
										{item.containsBeef && <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded">含牛</span>}
										{item.containsPork && <span className="px-1 py-0.5 bg-orange-100 text-orange-600 rounded">含豬</span>}
									</div>
								)}
							</div>
						))}
					</div>
				) : (
					<div className="text-gray-500 text-center py-8">本月尚未設定菜單</div>
				)}
				{currentMenu && !currentMenu.published && (
					<div className="mt-4">
						<form action={publishMenu}>
							<input type="hidden" name="menuId" value={currentMenu.id} />
							<Button type="submit" variant="primary">發布菜單</Button>
						</form>
					</div>
				)}
				{currentMenu?.published && (
					<div className="mt-4">
						<span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">已發布</span>
					</div>
				)}
			</div>

			{/* 下月菜單 */}
			<div className="bg-white rounded-lg border p-4">
				<h2 className="font-medium mb-4">下月菜單 ({nextMonthStr})</h2>
				{nextMenu ? (
					<div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
							{nextMenu.items.map(item => (
								<div key={item.id} className="border rounded-lg p-4">
									<div className="flex items-center justify-between mb-2">
										<span className="font-medium text-lg">選項 {item.code}</span>
										{item.isVegetarian && (
											<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">素食</span>
										)}
									</div>
									<div className="text-gray-700 mb-2">{item.name}</div>
									{!item.isVegetarian && (
										<div className="text-xs text-gray-500 space-x-2">
											{item.containsBeef && <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded">含牛</span>}
											{item.containsPork && <span className="px-1 py-0.5 bg-orange-100 text-orange-600 rounded">含豬</span>}
										</div>
									)}
								</div>
							))}
						</div>
						{!nextMenu.published && (
							<form action={publishMenu}>
								<input type="hidden" name="menuId" value={nextMenu.id} />
								<Button type="submit" variant="primary">發布菜單</Button>
							</form>
						)}
						{nextMenu.published && (
							<span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">已發布</span>
						)}
					</div>
				) : (
					<form action={createNextMenu} className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							{/* 選項 A */}
							<div className="border rounded-lg p-4">
								<label className="block mb-2">
									<span className="font-medium">選項 A</span>
									<input name="itemA" placeholder="例：薄皮嫩雞" required />
								</label>
								<div className="space-y-2">
									<label className="flex items-center gap-2">
										<input type="checkbox" name="aHasBeef" />
										<span className="text-sm">含牛肉</span>
									</label>
									<label className="flex items-center gap-2">
										<input type="checkbox" name="aHasPork" />
										<span className="text-sm">含豬肉</span>
									</label>
								</div>
							</div>

							{/* 選項 B */}
							<div className="border rounded-lg p-4">
								<label className="block mb-2">
									<span className="font-medium">選項 B</span>
									<input name="itemB" placeholder="例：蒜泥白肉" required />
								</label>
								<div className="space-y-2">
									<label className="flex items-center gap-2">
										<input type="checkbox" name="bHasBeef" />
										<span className="text-sm">含牛肉</span>
									</label>
									<label className="flex items-center gap-2">
										<input type="checkbox" name="bHasPork" />
										<span className="text-sm">含豬肉</span>
									</label>
								</div>
							</div>

							{/* 選項 C */}
							<div className="border rounded-lg p-4">
								<label className="block mb-2">
									<span className="font-medium">選項 C（素食）</span>
									<input name="itemC" placeholder="例：素食便當" required />
								</label>
								<div className="text-sm text-green-600">
									固定為素食選項
								</div>
							</div>
						</div>
						<Button type="submit" variant="primary">建立下月菜單</Button>
					</form>
				)}
			</div>
		</div>
	)
}
