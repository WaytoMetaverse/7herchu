import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
	try {
		// 測試基本連接
		await prisma.$connect()
		
		// 測試簡單查詢
		const userCount = await prisma.user.count()
		const eventCount = await prisma.event.count()
		
		return NextResponse.json({
			status: 'success',
			message: 'Database connection successful',
			data: {
				userCount,
				eventCount,
				timestamp: new Date().toISOString()
			}
		})
	} catch (error) {
		console.error('Database connection test failed:', error)
		
		return NextResponse.json({
			status: 'error',
			message: 'Database connection failed',
			error: error instanceof Error ? error.message : String(error),
			timestamp: new Date().toISOString()
		}, { status: 500 })
	} finally {
		await prisma.$disconnect()
	}
}
