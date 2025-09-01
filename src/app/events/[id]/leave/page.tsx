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

	const user = await prisma.user.findUnique({ 
		where: { email: session.user.email },
		include: { memberProfile: true }
	})
	if (!user) redirect('/auth/signin')

	// 檢查是否已報名
	const existingReg = user.phone ? await prisma.registration.findUnique({
		where: { eventId_phone: { eventId, phone: user.phone } }
	}) : null

	// 處理請假
	async function submitLeave() {
		'use server'
		
		if (!user) return
		
		if (existingReg) {
			// 更新為請假狀態
			await prisma.registration.update({
				where: { id: existingReg.id },
				data: { status: 'LEAVE' }
			})
		} else {
			// 新增請假記錄
			await prisma.registration.create({
				data: {
					eventId,
					userId: user.id,
					role: 'MEMBER',
					name: user.name || '',
					phone: user.phone || '',
					status: 'LEAVE',
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
				<h1 className="text-2xl font-semibold">活動請假</h1>
				<div className="text-gray-600">
					<div className="font-medium">{event.title}</div>
					<div className="text-sm">
						{format(event.startAt, 'yyyy/MM/dd（EEEEE） HH:mm', { locale: zhTW })}
					</div>
					<div className="text-sm">{event.location}</div>
				</div>
			</div>

			{existingReg && existingReg.status === 'REGISTERED' && (
				<div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700 text-center">
					您已報名此活動，確認請假將取消您的報名。
				</div>
			)}

			{existingReg && existingReg.status === 'LEAVE' && (
				<div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 text-center">
					您已請假此活動。
				</div>
			)}

			<form action={submitLeave} className="space-y-6">
				<div className="flex items-center gap-3 justify-center">
					<Button type="submit" variant="outline" size="sm">
						{existingReg?.status === 'LEAVE' ? '確認請假' : '確認請假'}
					</Button>
					<Button as={Link} href={`/hall/${eventId}`} variant="primary" size="sm">
						取消
					</Button>
				</div>
			</form>
		</div>
	)
}