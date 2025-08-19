import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Link from 'next/link'

export default async function CalendarSpeakersPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')
  const roles = ((session.user as { roles?: string[] } | undefined)?.roles) ?? []
  const canManage = roles.includes('admin') || roles.includes('event_manager')

  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) notFound()
  const speakers = await prisma.speakerBooking.findMany({ where: { eventId }, orderBy: { createdAt: 'asc' } })

  async function deleteBooking(formData: FormData) {
    'use server'
    const sess = await getServerSession(authOptions)
    const r = ((sess?.user as { roles?: string[] } | undefined)?.roles) ?? []
    const allowed = r.includes('admin') || r.includes('event_manager')
    if (!allowed) return
    const id = String(formData.get('id') || '')
    if (!id) return
    await prisma.speakerBooking.delete({ where: { id } })
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-semibold">講師名單 · {event.title}</h1>
        <Link href="/calendar"><Button variant="outline" size="sm">返回</Button></Link>
      </div>

      <Card>
        <CardContent>
          {speakers.length === 0 ? (
            <div className="text-sm text-gray-500">目前沒有講師預約</div>
          ) : (
            <ul className="divide-y">
              {speakers.map(s => (
                <li key={s.id} className="py-3 text-sm flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">{s.name} · {s.companyName || '-'} · {s.industry || '-'}</div>
                    <div className="text-gray-600">手機：{s.phone} · 邀請人：{s.invitedBy || '-'}</div>
                    <div className="text-gray-600">PPT：{s.pptUrl ? <a href={s.pptUrl} target="_blank" className="text-blue-600 underline">連結</a> : '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage ? (
                      <Link href={`/speaker/book?event=${eventId}&mode=edit&phone=${encodeURIComponent(s.phone)}`}><Button variant="outline" size="sm">編輯</Button></Link>
                    ) : null}
                    {canManage ? (
                      <form action={deleteBooking}>
                        <input type="hidden" name="id" value={s.id} />
                        <Button variant="danger" size="sm">刪除</Button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


