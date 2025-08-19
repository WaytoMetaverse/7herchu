import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import crypto from 'crypto'
import Button from '@/components/ui/Button'

async function createInvite(formData: FormData) {
	'use server'
	const eventId = String(formData.get('eventId'))
	const invitedBy = String(formData.get('invitedBy') ?? '')
	const maxUses = Number(formData.get('maxUses') ?? 50)
	const days = Number(formData.get('days') ?? 14)
	if (!eventId) return
	const token = crypto.randomBytes(12).toString('hex')
	const expiresAt = new Date(Date.now() + days * 86400_000)
	await prisma.guestInvite.create({ data: { eventId, invitedBy, maxUses, expiresAt, token } })
}

export default async function InvitesPage({ params }: { params: Promise<{ eventId: string }> }) {
	const { eventId } = await params
	const event = await prisma.event.findUnique({ where: { id: eventId } })
	if (!event) notFound()
	const invites = await prisma.guestInvite.findMany({ where: { eventId }, orderBy: { createdAt: 'desc' } })
	return (
		<div className="max-w-3xl mx-auto p-4 space-y-4">
			<h1 className="text-2xl lg:text-3xl font-semibold">來賓邀請：{event.title}</h1>
			<form action={createInvite} className="border rounded p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
				<input type="hidden" name="eventId" defaultValue={event.id} />
				<label className="text-sm">邀請人
					<input name="invitedBy" className="border rounded w-full px-2 py-1" placeholder="您的姓名" />
				</label>
				<label className="text-sm">有效天數
					<input name="days" type="number" min={1} defaultValue={14} className="border rounded w-full px-2 py-1" />
				</label>
				<label className="text-sm">最大使用次數
					<input name="maxUses" type="number" min={1} defaultValue={50} className="border rounded w-full px-2 py-1" />
				</label>
				<div className="col-span-1 md:col-span-3">
					<Button type="submit">建立邀請連結</Button>
				</div>
			</form>
			<div className="space-y-2">
				{invites.map((g) => (
					<div key={g.id} className="border rounded p-3 text-sm">
						<div className="flex justify-between">
							<div>
								<div>邀請人：{g.invitedBy ?? '-'}</div>
								<div>使用：{g.usedCount}/{g.maxUses ?? '∞'} · 到期：{g.expiresAt ? new Date(g.expiresAt).toLocaleString('zh-TW') : '無'}</div>
							</div>
							<a className="text-blue-600 underline" href={`/guest/register?token=${g.token}`} target="_blank">開啟連結</a>
						</div>
						<div className="mt-1 text-xs text-gray-600 break-all">{`http://localhost:3000/guest/register?token=${g.token}`}</div>
					</div>
				))}
			</div>
		</div>
	)
}
