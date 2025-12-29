import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { revalidatePath } from 'next/cache'
import { getDisplayName } from '@/lib/displayName'
import { GuestType } from '@prisma/client'
import SpeakersGuestsDetailClient from '@/components/admin/SpeakersGuestsDetailClient'

export default async function SpeakersGuestsDetailPage({ 
	params 
}: { 
	params: Promise<{ id: string }> 
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
					</div>
				</div>
			)
		}

	const { id } = await params
	const profile = await prisma.guestSpeakerProfile.findUnique({
		where: { id },
		include: {
			notes: {
				include: {
					creator: {
						select: {
							name: true,
							nickname: true
						}
					}
				},
				orderBy: { createdAt: 'desc' }
			}
		}
	})

	if (!profile) notFound()

	// 查詢該人的所有參與記錄（從 SpeakerBooking 和 Registration）
	const [speakerBookings, registrations] = await Promise.all([
		prisma.speakerBooking.findMany({
			where: {
				phone: profile.phone,
				name: profile.name
			},
			include: {
				event: {
					select: {
						id: true,
						title: true,
						startAt: true,
						type: true
					}
				}
			},
			orderBy: { createdAt: 'desc' }
		}),
		prisma.registration.findMany({
			where: {
				phone: profile.phone,
				name: profile.name,
				OR: [
					{ role: 'GUEST' },
					{ role: 'SPEAKER', userId: null } // 來賓升為講師
				]
			},
			include: {
				event: {
					select: {
						id: true,
						title: true,
						startAt: true,
						type: true
					}
				}
			},
			orderBy: { createdAt: 'desc' }
		})
	])

	// 合併參與記錄，講師優先
	type ParticipationRecord = {
		eventId: string
		eventTitle: string
		eventDate: Date
		role: 'GUEST' | 'SPEAKER'
	}

	const participations: ParticipationRecord[] = []
	const eventMap = new Map<string, ParticipationRecord>()

	// 先加入講師記錄（優先）
	for (const booking of speakerBookings) {
		if (booking.event) {
			eventMap.set(booking.eventId, {
				eventId: booking.eventId,
				eventTitle: booking.event.title,
				eventDate: booking.event.startAt,
				role: 'SPEAKER'
			})
		}
	}

	// 再加入來賓記錄（如果該活動還沒有記錄）
	for (const reg of registrations) {
		if (reg.event && !eventMap.has(reg.eventId)) {
			eventMap.set(reg.eventId, {
				eventId: reg.eventId,
				eventTitle: reg.event.title,
				eventDate: reg.event.startAt,
				role: reg.role === 'SPEAKER' ? 'SPEAKER' : 'GUEST'
			})
		}
	}

	participations.push(...Array.from(eventMap.values()))
	participations.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime())

	const isAdmin = ((session?.user as { roles?: string[] } | undefined)?.roles ?? []).includes('admin')

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

	// 新增留言
	async function addNote(formData: FormData) {
		'use server'
		if (!user) return
		
		const content = String(formData.get('content') || '').trim()
		if (!content || content.length > 100) return

		await prisma.guestSpeakerNote.create({
			data: {
				profileId: id,
				content,
				createdBy: user.id
			}
		})
		revalidatePath(`/admin/speakers-guests/${id}`)
	}

	// 編輯留言
	async function updateNote(formData: FormData) {
		'use server'
		if (!user) return
		
		const noteId = String(formData.get('noteId') || '')
		const content = String(formData.get('content') || '').trim()
		if (!noteId || !content || content.length > 100) return

		// 檢查權限：管理員或留言者本人
		const note = await prisma.guestSpeakerNote.findUnique({
			where: { id: noteId }
		})
		if (!note) return
		if (!isAdmin && note.createdBy !== user.id) return

		await prisma.guestSpeakerNote.update({
			where: { id: noteId },
			data: { content }
		})
		revalidatePath(`/admin/speakers-guests/${id}`)
	}

	// 刪除留言
	async function deleteNote(formData: FormData) {
		'use server'
		if (!user || !isAdmin) return
		
		const noteId = String(formData.get('noteId') || '')
		if (!noteId) return

		await prisma.guestSpeakerNote.delete({
			where: { id: noteId }
		})
		revalidatePath(`/admin/speakers-guests/${id}`)
	}

	// 編輯資料（管理員）
	async function updateProfile(formData: FormData) {
		'use server'
		if (!user || !isAdmin) return

		const name = String(formData.get('name') || '').trim()
		const phone = String(formData.get('phone') || '').trim()
		const companyName = String(formData.get('companyName') || '').trim() || null
		const industry = String(formData.get('industry') || '').trim() || null
		const guestType = String(formData.get('guestType') || '') as GuestType | null
		const bniChapter = String(formData.get('bniChapter') || '').trim() || null
		const invitedBy = String(formData.get('invitedBy') || '').trim() || null

		if (!name) return

		// 如果是講師，需要手機號碼；來賓則使用原有的手機號碼
		const currentProfile = await prisma.guestSpeakerProfile.findUnique({
			where: { id }
		})
		if (!currentProfile) return

		const finalPhone = phone || currentProfile.phone
		if (!finalPhone) return

		// 檢查新的「手機+姓名」組合是否已存在（排除自己）
		const existing = await prisma.guestSpeakerProfile.findFirst({
			where: {
				phone: finalPhone,
				name,
				NOT: { id }
			}
		})
		if (existing) {
			return { error: '此手機號碼和姓名組合已存在' }
		}

		await prisma.guestSpeakerProfile.update({
			where: { id },
			data: {
				name,
				phone: finalPhone,
				companyName,
				industry,
				guestType,
				bniChapter,
				invitedBy
			}
		})
		revalidatePath(`/admin/speakers-guests/${id}`)
		revalidatePath('/admin/speakers-guests')
	}

	// 刪除資料（管理員）
	async function deleteProfile() {
		'use server'
		if (!user || !isAdmin) return

		await prisma.guestSpeakerProfile.delete({
			where: { id }
		})
		revalidatePath('/admin/speakers-guests')
		redirect('/admin/speakers-guests')
	}

	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">來賓/講師詳細資料</h1>
				<Button as={Link} href="/admin/speakers-guests" variant="outline">返回列表</Button>
			</div>

			<SpeakersGuestsDetailClient
				profile={{
					id: profile.id,
					name: profile.name,
					phone: profile.phone,
					companyName: profile.companyName || '',
					industry: profile.industry || '',
					guestType: profile.guestType,
					bniChapter: profile.bniChapter || '',
					bniChapterDisplay: formatBniChapter(profile.guestType, profile.bniChapter),
					invitedBy: profile.invitedBy || '',
					role: profile.role as 'GUEST' | 'SPEAKER'
				}}
				participations={participations.map(p => ({
					eventId: p.eventId,
					eventTitle: p.eventTitle,
					eventDate: p.eventDate.toISOString(),
					role: p.role
				}))}
				notes={profile.notes.map(note => ({
					id: note.id,
					content: note.content,
					creatorName: getDisplayName(note.creator),
					createdAt: note.createdAt.toISOString(),
					createdBy: note.createdBy
				}))}
				currentUserId={user.id}
				isAdmin={isAdmin}
				addNote={addNote}
				updateNote={updateNote}
				deleteNote={deleteNote}
				updateProfile={updateProfile}
				deleteProfile={deleteProfile}
			/>
		</div>
	)
}

