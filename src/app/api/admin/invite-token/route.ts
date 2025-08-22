import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function POST() {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.email) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const roles = ((session.user as { roles?: string[] } | undefined)?.roles) ?? []
		const isAdmin = roles.includes('admin')
		
		if (!isAdmin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const user = await prisma.user.findUnique({ where: { email: session.user.email } })
		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 })
		}

		// 檢查是否已有活躍的邀請 token
		let existingToken = await prisma.inviteToken.findFirst({
			where: { 
				createdBy: user.id,
				isActive: true 
			}
		})

		if (!existingToken) {
			// 生成新的永久邀請 token
			const token = randomUUID()
			existingToken = await prisma.inviteToken.create({
				data: {
					token,
					createdBy: user.id
				}
			})
		}

		return NextResponse.json({ 
			token: existingToken.token,
			usedCount: existingToken.usedCount,
			createdAt: existingToken.createdAt
		})
	} catch (error) {
		console.error('Generate invite token error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
