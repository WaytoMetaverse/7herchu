import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const email = 'ai.lexihsu@gmail.com'
  const roles: any = ['admin','event_manager','menu_manager','finance_manager','checkin_manager']
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ ok: false, error: 'user not found' }, { status: 404 })
  await prisma.user.update({ where: { id: user.id }, data: { roles } })
  return NextResponse.json({ ok: true, email, roles })
}


