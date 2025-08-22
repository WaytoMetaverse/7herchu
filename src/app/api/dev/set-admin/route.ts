import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export async function POST(req: NextRequest) {
	try {
		const { email } = await req.json()
		const targetEmail = email || 'ai.lexihsu@gmail.com'
		
		// 查找用戶
		let user = await prisma.user.findUnique({ where: { email: targetEmail } })
		
		// 如果用戶不存在，創建一個
		if (!user) {
			user = await prisma.user.create({
				data: {
					email: targetEmail,
					name: 'Admin User',
					roles: ['admin']
				}
			})
			
			// 創建 MemberProfile
			await prisma.memberProfile.create({
				data: {
					userId: user.id,
					memberType: 'FIXED'
				}
			})
			
			return NextResponse.json({ 
				ok: true, 
				message: 'User created and set as admin',
				email: targetEmail, 
				roles: ['admin'] 
			})
		}
		
		// 如果用戶存在，更新角色
		const roles: Role[] = ['admin', 'event_manager', 'menu_manager', 'finance_manager', 'checkin_manager']
		await prisma.user.update({ 
			where: { email: targetEmail }, 
			data: { roles, isActive: true } 
		})
		
		return NextResponse.json({ 
			ok: true, 
			message: 'User updated as admin',
			email: targetEmail, 
			roles 
		})
	} catch (error) {
		console.error('Set admin error:', error)
		return NextResponse.json({ 
			ok: false, 
			error: error instanceof Error ? error.message : 'Unknown error' 
		}, { status: 500 })
	}
}
