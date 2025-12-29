import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { GuestType } from '@prisma/client'
import SpeakersGuestsClient from '@/components/admin/SpeakersGuestsClient'
import { revalidatePath } from 'next/cache'

export default async function SpeakersGuestsPage({ 
	searchParams 
}: { 
	searchParams?: Promise<{ 
		q?: string
		sortBy?: string
		sortOrder?: 'asc' | 'desc'
	}> 
}) {
	const session = await getServerSession(authOptions)
	if (!session?.user) redirect('/auth/signin')

	// 檢查是否為內部成員
	const user = await prisma.user.findUnique({
		where: { email: session.user.email! },
		include: { memberProfile: true }
	})

	if (!user || !user.isActive || !user.memberProfile) {
		return (
			<div className="max-w-6xl mx-auto p-4">
				<div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4">
					<h1 className="text-lg font-medium mb-1">無權限</h1>
					<p className="text-sm">此頁僅內部成員可查看。</p>
					<div className="mt-3">
						<Link href="/group" className="text-blue-600 hover:text-blue-800 underline">返回小組管理</Link>
					</div>
				</div>
			</div>
		)
	}

	const sp = await searchParams
	const q = (sp?.q || '').trim()
	const sortBy = sp?.sortBy || 'lastEventDate'
	const sortOrder = sp?.sortOrder || 'desc'

	// 檢查是否需要初始化歷史資料
	const profileCount = await prisma.guestSpeakerProfile.count()
	if (profileCount === 0) {
		// 首次訪問，自動初始化歷史資料
		await initHistoricalData()
		revalidatePath('/admin/speakers-guests')
	}

	// 取得所有來賓和講師資料（去重）
	const profiles = await prisma.guestSpeakerProfile.findMany({
		where: q ? {
			OR: [
				{ name: { contains: q } },
				{ phone: { contains: q } },
				{ companyName: { contains: q } },
				{ industry: { contains: q } },
				{ bniChapter: { contains: q } },
				{ invitedBy: { contains: q } }
			]
		} : {},
		orderBy: { [sortBy]: sortOrder },
		include: {
			_count: {
				select: { notes: true }
			}
		}
	})

	// 格式化 BNI 分會顯示
	function formatBniChapter(guestType: GuestType | null, bniChapter: string | null): string {
		if (!guestType) return '-'
		if (guestType === 'PANSHI') {
			return bniChapter ? `磐石分會 ${bniChapter}` : '磐石分會'
		}
		if (guestType === 'OTHER_BNI') {
			return bniChapter ? `其他分會 ${bniChapter}` : '其他分會'
		}
		if (guestType === 'NON_BNI') {
			return '非BNI'
		}
		return '-'
	}

	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">來賓/講師管理</h1>
				<Button as={Link} href="/group" variant="outline">返回小組管理</Button>
			</div>

			<SpeakersGuestsClient 
				profiles={profiles.map(p => ({
					id: p.id,
					role: p.role as 'GUEST' | 'SPEAKER',
					lastEventDate: p.lastEventDate,
					name: p.name,
					phone: p.phone,
					companyName: p.companyName || '',
					industry: p.industry || '',
					bniChapter: formatBniChapter(p.guestType, p.bniChapter),
					invitedBy: p.invitedBy || '',
					noteCount: p._count.notes
				}))}
				initialQ={q}
				initialSortBy={sortBy}
				initialSortOrder={sortOrder}
			/>
		</div>
	)
}

// 初始化歷史資料
async function initHistoricalData() {
	'use server'
	
	// 取得所有已結束的活動
	const now = new Date()
	const pastEvents = await prisma.event.findMany({
		where: {
			endAt: { lt: now }
		},
		include: {
			speakerBookings: true,
			registrations: {
				where: {
					OR: [
						{ role: 'GUEST' },
						{ role: 'SPEAKER', userId: null } // 來賓升為講師
					]
				}
			}
		}
	})

	const profileMap = new Map<string, {
		name: string
		phone: string
		companyName?: string
		industry?: string
		guestType?: GuestType
		bniChapter?: string
		invitedBy?: string
		role: 'GUEST' | 'SPEAKER'
		lastEventDate: Date
	}>()

	// 處理講師預約（SpeakerBooking）
	for (const event of pastEvents) {
		for (const speaker of event.speakerBookings) {
			const key = `${speaker.phone}_${speaker.name}`
			const existing = profileMap.get(key)
			
			// 判斷 guestType（歷史資料：如果有 bniChapter 則為 OTHER_BNI，否則為 NON_BNI）
			const guestType: GuestType = speaker.guestType || (speaker.bniChapter ? 'OTHER_BNI' : 'NON_BNI')
			
			if (!existing || event.startAt > existing.lastEventDate) {
				profileMap.set(key, {
					name: speaker.name,
					phone: speaker.phone,
					companyName: speaker.companyName || undefined,
					industry: speaker.industry || undefined,
					guestType,
					bniChapter: speaker.bniChapter || undefined,
					invitedBy: speaker.invitedBy || undefined,
					role: 'SPEAKER',
					lastEventDate: event.startAt
				})
			} else if (existing.role === 'GUEST' && event.startAt > existing.lastEventDate) {
				// 如果原本是來賓，但這次是講師，優先顯示講師
				profileMap.set(key, {
					...existing,
					role: 'SPEAKER',
					lastEventDate: event.startAt,
					guestType: guestType || existing.guestType,
					bniChapter: speaker.bniChapter || existing.bniChapter,
					companyName: speaker.companyName || existing.companyName,
					industry: speaker.industry || existing.industry,
					invitedBy: speaker.invitedBy || existing.invitedBy
				})
			}
		}
	}

	// 處理來賓報名（Registration）
	for (const event of pastEvents) {
		for (const reg of event.registrations) {
			if (!reg.phone || !reg.name) continue
			
			const key = `${reg.phone}_${reg.name}`
			const existing = profileMap.get(key)
			
			if (!existing) {
				// 新資料
				profileMap.set(key, {
					name: reg.name,
					phone: reg.phone,
					companyName: reg.companyName || undefined,
					industry: reg.industry || undefined,
					guestType: reg.guestType || undefined,
					bniChapter: reg.bniChapter || undefined,
					invitedBy: reg.invitedBy || undefined,
					role: reg.role === 'SPEAKER' ? 'SPEAKER' : 'GUEST',
					lastEventDate: event.startAt
				})
			} else if (event.startAt > existing.lastEventDate) {
				// 如果新活動日期更晚，更新資料
				if (existing.role === 'GUEST' && reg.role === 'SPEAKER') {
					// 如果原本是來賓，但這次是講師，優先顯示講師
					profileMap.set(key, {
						...existing,
						role: 'SPEAKER',
						lastEventDate: event.startAt,
						guestType: reg.guestType || existing.guestType,
						bniChapter: reg.bniChapter || existing.bniChapter,
						companyName: reg.companyName || existing.companyName,
						industry: reg.industry || existing.industry,
						invitedBy: reg.invitedBy || existing.invitedBy
					})
				} else {
					// 更新 lastEventDate 和其他資料
					profileMap.set(key, {
						...existing,
						lastEventDate: event.startAt,
						companyName: reg.companyName || existing.companyName,
						industry: reg.industry || existing.industry,
						guestType: reg.guestType || existing.guestType,
						bniChapter: reg.bniChapter || existing.bniChapter,
						invitedBy: reg.invitedBy || existing.invitedBy
					})
				}
			}
		}
	}

	// 批次建立或更新資料
	const profiles = Array.from(profileMap.values())
	if (profiles.length > 0) {
		for (const p of profiles) {
			// 檢查是否已存在
			const existing = await prisma.guestSpeakerProfile.findUnique({
				where: {
					phone_name: {
						phone: p.phone,
						name: p.name
					}
				}
			})

			if (existing) {
				// 更新：如果新活動日期更晚，更新 lastEventDate；如果新角色是講師，更新 role
				await prisma.guestSpeakerProfile.update({
					where: {
						phone_name: {
							phone: p.phone,
							name: p.name
						}
					},
					data: {
						lastEventDate: p.lastEventDate > existing.lastEventDate ? p.lastEventDate : existing.lastEventDate,
						role: p.role === 'SPEAKER' ? 'SPEAKER' : existing.role,
						companyName: p.companyName || existing.companyName,
						industry: p.industry || existing.industry,
						guestType: p.guestType || existing.guestType,
						bniChapter: p.bniChapter || existing.bniChapter,
						invitedBy: p.invitedBy || existing.invitedBy
					}
				})
			} else {
				// 建立新資料
				await prisma.guestSpeakerProfile.create({
					data: {
						name: p.name,
						phone: p.phone,
						companyName: p.companyName,
						industry: p.industry,
						guestType: p.guestType,
						bniChapter: p.bniChapter,
						invitedBy: p.invitedBy,
						role: p.role,
						lastEventDate: p.lastEventDate
					}
				})
			}
		}
	}
}

