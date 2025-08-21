import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export default async function EventLeavePage({ params }: { params: Promise<{ id: string }> }) {
	const { id: eventId } = await params
	const session = await getServerSession(authOptions)
	if (!session?.user?.email) redirect('/auth/signin')

	const event = await prisma.event.findUnique({ where: { id: eventId } })
	if (!event) notFound()

	const user = await prisma.user.findUnique({ where: { email: session.user.email } })
	if (!user) redirect('/auth/signin')

	// 檢查是否已有記錄
	const existingReg = await prisma.registration.findUnique({
		where: { eventId_phone: { eventId, phone: user.phone || '' } }
	})

	// 處理請假
	async function submitLeave() {
		'use server'
		if (!user) return
		
		// 如果已有報名記錄，則刪除
		if (existingReg) {
			await prisma.registration.delete({
				where: { id: existingReg.id }
			})
		}

		// 新增請假記錄（使用特殊狀態）
		await prisma.registration.create({
			data: {
				eventId,
				userId: user.id,
				role: 'MEMBER',
				name: user.name || '',
				phone: user.phone || '',
				status: 'leave', // 請假狀態
				paymentStatus: 'PAID' // 請假不需繳費
			}
		})

		revalidatePath(`/hall/${eventId}`)
		redirect(`/hall/${eventId}`)
	}

	const isOnLeave = existingReg?.status === 'leave'

	return (
		<div className="max-w-lg mx-auto p-4 space-y-6">
			<div className="text-center space-y-2">
				<h1 className="text-2xl font-semibold">請假登記</h1>
				<div className="text-gray-600">
					<div className="font-medium">{event.title}</div>
					<div className="text-sm">
						{format(event.startAt, 'yyyy/MM/dd（EEEEE） HH:mm', { locale: zhTW })}
					</div>
					<div className="text-sm">{event.location}</div>
				</div>
			</div>

			{isOnLeave ? (
				<div className="bg-orange-50 p-4 rounded-lg text-center">
					<div className="text-orange-700 font-medium mb-2">您已登記請假</div>
					<div className="text-sm text-orange-600">如需報名參加，請點擊下方「報名」按鈕</div>
				</div>
			) : existingReg ? (
				<div className="bg-blue-50 p-4 rounded-lg text-center">
					<div className="text-blue-700 font-medium mb-2">您已報名此活動</div>
					<div className="text-sm text-blue-600">確定要改為請假嗎？</div>
				</div>
			) : (
				<div className="bg-gray-50 p-4 rounded-lg text-center">
					<div className="text-gray-700 font-medium mb-2">請假登記</div>
					<div className="text-sm text-gray-600">登記請假後將不會出現在報名名單中</div>
				</div>
			)}

			<div className="flex items-center gap-3 justify-center">
				{isOnLeave ? (
					<Button as={Link} href={`/events/${eventId}/register`} variant="primary">
						改為報名
					</Button>
				) : (
					<form action={submitLeave}>
						<Button type="submit" variant="outline">
							確定請假
						</Button>
					</form>
				)}
				<Button as={Link} href={`/hall/${eventId}`} variant="ghost">取消</Button>
			</div>

			<div className="text-xs text-gray-500 text-center">
				請假記錄會保留，但不會出現在活動報名名單中
			</div>
		</div>
	)
}
