import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'

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
				select: { 
					id: true,
					mealCode: true,
					diet: true,
					noBeef: true,
					noPork: true,
					status: true
				}
			},
			speakerBookings: {
				select: {
					id: true,
					mealCode: true,
					diet: true,
					noBeef: true,
					noPork: true
				}
			}
		},
		orderBy: { startAt: 'desc' }
	})

	// 計算每個活動的統計
	const eventsWithStats = events.map(event => {
		const mealStats = {
			A: 0,
			B: 0,
			C: 0,
			total: 0
		}

		const dietStats = {
			meat: 0,
			veg: 0,
			noBeef: 0,
			noPork: 0,
			noBeefNoPork: 0,
			total: 0
		}

		// 統計一般報名（只統計已報名狀態）
		event.registrations.filter(reg => reg.status === 'REGISTERED').forEach(reg => {
			if (reg.mealCode) {
				// 餐點統計
				mealStats[reg.mealCode as keyof typeof mealStats]++
				mealStats.total++
			}
			
			// 飲食偏好統計
			if (reg.diet) {
				dietStats[reg.diet as keyof typeof dietStats]++
				dietStats.total++
			}
			if (reg.noBeef && reg.noPork) {
				dietStats.noBeefNoPork++
			} else {
				if (reg.noBeef) dietStats.noBeef++
				if (reg.noPork) dietStats.noPork++
			}
		})

		// 統計講師預約
		event.speakerBookings.forEach(booking => {
			if (booking.mealCode) {
				// 餐點統計
				mealStats[booking.mealCode as keyof typeof mealStats]++
				mealStats.total++
			}
			
			// 飲食偏好統計
			if (booking.diet) {
				dietStats[booking.diet as keyof typeof dietStats]++
				dietStats.total++
			}
			if (booking.noBeef && booking.noPork) {
				dietStats.noBeefNoPork++
			} else {
				if (booking.noBeef) dietStats.noBeef++
				if (booking.noPork) dietStats.noPork++
			}
		})

		return {
			...event,
			mealStats,
			dietStats
		}
	})





	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">活動餐點管理</h1>
				<Button as={Link} href="/group" variant="ghost">返回小組管理</Button>
			</div>

			<p className="text-gray-600">管理所有活動的餐點設定，Ai機器人輔助判斷餐點。</p>

			{/* 活動列表 */}
			<div className="space-y-4">
				{eventsWithStats.map(event => (
					<div key={event.id} className="bg-white border rounded-lg p-6">
						<div className="flex items-start justify-between mb-4">
							<div className="flex-1">
								<h3 className="text-lg font-medium">{event.title}</h3>
								<p className="text-sm text-gray-600">
									{new Date(event.startAt).toLocaleDateString('zh-TW')} {event.location}
								</p>
								<p className="text-sm text-gray-500">
									報名人數：{event.registrations.filter(reg => reg.status === 'REGISTERED').length + event.speakerBookings.length} 人
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
								<Link
									href={`/admin/menus/${event.id}/edit`}
									className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
								>
									{event.eventMenu?.hasMealService ? '編輯餐點' : '設定餐點'}
								</Link>
							</div>
						</div>

						{/* 餐點統計 */}
						{event.eventMenu?.hasMealService ? (
							<div className="bg-blue-50 p-4 rounded-lg">
								<h4 className="font-medium text-blue-900 mb-2">餐點統計（A/B/C）</h4>
								<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
									<div className="text-center">
										<div className="text-lg font-semibold text-blue-700">{event.mealStats.A}</div>
										<div className="text-blue-600">A. {event.eventMenu?.mealCodeA ?? ''}</div>
									</div>
									<div className="text-center">
										<div className="text-lg font-semibold text-blue-700">{event.mealStats.B}</div>
										<div className="text-blue-600">B. {event.eventMenu?.mealCodeB ?? ''}</div>
									</div>
									<div className="text-center">
										<div className="text-lg font-semibold text-blue-700">{event.mealStats.C}</div>
										<div className="text-blue-600">C. {event.eventMenu?.mealCodeC ?? ''}</div>
									</div>
									<div className="text-center">
										<div className="text-lg font-semibold text-blue-900">{event.mealStats.total}</div>
										<div className="text-blue-800">總計</div>
									</div>
								</div>
							</div>
						) : (
							<div className="bg-gray-50 p-4 rounded-lg">
								<h4 className="font-medium text-gray-900 mb-2">飲食偏好統計</h4>
								<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
									{/* 葷食（無限制） */}
									{event.dietStats.meat > 0 && (
										<div className="text-center">
											<div className="text-lg font-semibold text-gray-700">{event.dietStats.meat}</div>
											<div className="text-gray-600">葷食（無限制）</div>
										</div>
									)}
									
									{/* 葷食（不吃牛） */}
									{event.dietStats.noBeef > 0 && (
										<div className="text-center">
											<div className="text-lg font-semibold text-gray-700">{event.dietStats.noBeef}</div>
											<div className="text-gray-600">葷食（不吃牛）</div>
										</div>
									)}
									
									{/* 葷食（不吃豬） */}
									{event.dietStats.noPork > 0 && (
										<div className="text-center">
											<div className="text-lg font-semibold text-gray-700">{event.dietStats.noPork}</div>
											<div className="text-gray-600">葷食（不吃豬）</div>
										</div>
									)}
									
									{/* 葷食（不吃牛不吃豬） */}
									{event.dietStats.noBeefNoPork > 0 && (
										<div className="text-center">
											<div className="text-lg font-semibold text-gray-700">{event.dietStats.noBeefNoPork}</div>
											<div className="text-gray-600">葷食（不吃牛不吃豬）</div>
										</div>
									)}
									
									{/* 素食 */}
									{event.dietStats.veg > 0 && (
										<div className="text-center">
											<div className="text-lg font-semibold text-gray-700">{event.dietStats.veg}</div>
											<div className="text-gray-600">素食</div>
										</div>
									)}
									
									{/* 總計 */}
									<div className="text-center">
										<div className="text-lg font-semibold text-gray-900">{event.dietStats.total}</div>
										<div className="text-gray-800">共</div>
									</div>
								</div>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	)
}
