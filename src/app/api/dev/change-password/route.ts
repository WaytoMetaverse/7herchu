import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
      return NextResponse.json({ ok: false, error: 'not allowed in production' }, { status: 403 })
    }
    const body = await req.json().catch(() => null) as { emails?: string[]; password?: string } | null
    if (!body || !Array.isArray(body.emails) || !body.emails.length) {
      return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 })
    }
    const password = body.password || '123'
    const hash = bcrypt.hashSync(password, 10)
    const users = await prisma.user.findMany({ where: { email: { in: body.emails } }, select: { id: true, email: true } })
    if (users.length === 0) return NextResponse.json({ ok: false, error: 'users not found' }, { status: 404 })
    await prisma.$transaction(users.map(u => prisma.user.update({ where: { id: u.id }, data: { passwordHash: hash } })))
    return NextResponse.json({ ok: true, emails: users.map(u => u.email), password })
  } catch (e) {
    console.error('change-password error:', e)
    return NextResponse.json({ ok: false, error: 'internal error' }, { status: 500 })
  }
}
