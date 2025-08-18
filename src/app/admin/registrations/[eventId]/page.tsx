import { prisma } from '@/lib/prisma'
import { Registration } from '@prisma/client'
import { notFound } from 'next/navigation'

function toCsv(rows: Registration[]) {
	const headers = ['角色', '姓名', '手機', '公司', '產業', 'BNI', '邀請人', '餐點', '葷素', '不吃牛', '不吃豬', '簽到時間', '付款狀態']
	const lines = rows.map((r) => [
		r.role,
		r.name ?? '',
		r.phone ?? '',
		r.companyName ?? '',
		r.industry ?? '',
		r.bniChapter ?? '',
		r.invitedBy ?? '',
		r.mealCode ?? '',
		r.diet ?? '',
		r.noBeef ? '是' : '否',
		r.noPork ? '是' : '否',
		r.checkedInAt ? new Date(r.checkedInAt).toLocaleString('zh-TW') : '',
		r.paymentStatus,
	].map((s) => `"${String(s).replaceAll('"', '""')}"`).join(','))
	return [headers.join(','), ...lines].join('\n')
}

export default async function RegistrationsPage({ params }: { params: Promise<{ eventId: string }> }) {
	const { eventId } = await params
	const event = await prisma.event.findUnique({ where: { id: eventId } })
	if (!event) notFound()
	const regs = await prisma.registration.findMany({
		where: { eventId },
		orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
	})
	const csv = toCsv(regs)

	return (
		<div className="max-w-5xl mx-auto p-4 space-y-4">
			<h1 className="text-xl font-semibold">報名管理：{event.title}</h1>
			<div className="flex gap-2 text-sm">
				<a className="px-3 py-1 border rounded" href={`/admin/checkin/${event.id}`}>前往簽到</a>
				<a className="px-3 py-1 border rounded" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download={`registrations-${event.id}.csv`}>匯出 CSV</a>
			</div>
			<div className="grid grid-cols-1 gap-2">
				{regs.map((r) => (
					<div key={r.id} className="border rounded p-3 text-sm flex justify-between">
						<div>
							<div className="font-medium">{r.name ?? '成員'}（{r.role}） {r.phone ? `· ${r.phone}` : ''}</div>
							<div className="text-gray-600">{r.companyName ?? ''} {r.industry ? `· ${r.industry}` : ''} {r.bniChapter ? `· ${r.bniChapter}` : ''}</div>
							<div className="text-gray-500">餐點：{r.mealCode ?? '-'} · 葷素：{r.diet ?? '-'} · 不吃牛：{r.noBeef ? '是' : '否'} · 不吃豬：{r.noPork ? '是' : '否'}</div>
						</div>
						<div className="text-right text-xs text-gray-600">
							<div>簽到：{r.checkedInAt ? new Date(r.checkedInAt).toLocaleString('zh-TW') : '未簽到'}</div>
							<div>付款：{r.paymentStatus}</div>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
