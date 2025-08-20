import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const ALLOWED_EMAILS = new Set(['test@gmail.com', 'test2@gmail.com'])

export async function POST(req: NextRequest) {
	// 僅限已登入且具備 admin 角色
	const session = await getServerSession(authOptions)
	const roles = (session?.user as { roles?: string[] } | null)?.roles || []
	if (!session?.user || !roles.includes('admin')) {
		return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
	}

	try {
		const body = (await req.json().catch(() => null)) as { emails?: string[]; password?: string } | null
		const emails = (body?.emails && body.emails.length ? body.emails : Array.from(ALLOWED_EMAILS)).filter(e => ALLOWED_EMAILS.has(e))
		if (emails.length === 0) {
			return NextResponse.json({ ok: false, error: 'no allowed emails' }, { status: 400 })
		}
		const password = (body?.password && String(body.password)) || '123'
		const hash = bcrypt.hashSync(password, 10)

		const updated = await prisma.user.updateMany({ where: { email: { in: emails } }, data: { passwordHash: hash } })
		return NextResponse.json({ ok: true, updatedCount: updated.count, emails, password })
	} catch (e) {
		console.error('admin-reset-password error:', e)
		return NextResponse.json({ ok: false, error: 'internal error' }, { status: 500 })
	}
}
