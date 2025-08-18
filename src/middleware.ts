import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
	const p = req.nextUrl.pathname
	const isProtected = p.startsWith('/admin') || p.startsWith('/cards')
	if (!isProtected) return NextResponse.next()

	// 開發暫時跳過保護：未配置 Google 或設為停用
	if (process.env.AUTH_DISABLE === '1' || !process.env.GOOGLE_CLIENT_ID) {
		return NextResponse.next()
	}

	const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
	if (!token) return NextResponse.redirect(new URL('/auth/signin', req.url))

	// TODO: 之後可依路徑檢查角色，例如
	// const roles: string[] = (token as any).roles || []
	// if (req.nextUrl.pathname.startsWith('/admin/checkin') && !roles.includes('checkin_manager') && !roles.includes('admin'))
	//   return NextResponse.redirect(new URL('/', req.url))

	return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*', '/cards/:path*'] }
