import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
	try {
		const { token } = await req.json()
		if (!token) {
			return NextResponse.json({ valid: false, error: 'No token provided' })
		}

		// 檢查邀請 token 是否存在且有效
		const inviteToken = await prisma.inviteToken.findUnique({
			where: { token },
			select: { id: true, isActive: true }
		})

		const valid = inviteToken?.isActive || false
		return NextResponse.json({ valid })
	} catch (error) {
		console.error('Verify invite token error:', error)
		return NextResponse.json({ valid: false, error: 'Internal server error' })
	}
}
