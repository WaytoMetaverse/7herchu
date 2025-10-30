import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import AnnouncementsClient from './AnnouncementsClient'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export default async function AnnouncementsPage() {
	const session = await getServerSession(authOptions)
	if (!session?.user) redirect('/auth/signin')
	
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const isAdmin = roles.includes('admin')

	if (!isAdmin) {
		redirect('/auth/signin')
	}

	// 取得所有公告記錄（最新的在前）
	const announcements = await prisma.announcement.findMany({
		include: {
			sender: {
				select: {
					name: true,
					nickname: true
				}
			}
		},
		orderBy: { createdAt: 'desc' },
		take: 50 // 最多顯示最近50筆
	})

	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">公告管理</h1>
				<div className="flex gap-2">
					<Button as={Link} href="/group" variant="outline">
						返回小組管理
					</Button>
					<AnnouncementsClient />
				</div>
			</div>

			{/* 歷史記錄 */}
			<div className="bg-white rounded-lg border">
				<div className="p-4 border-b">
					<h2 className="text-lg font-medium">發送歷史</h2>
				</div>
				<div className="divide-y">
					{announcements.length === 0 ? (
						<div className="p-8 text-center text-gray-500">
							還沒有發送過公告
						</div>
					) : (
						announcements.map((announcement) => (
							<div key={announcement.id} className="p-4 hover:bg-gray-50 transition-colors">
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-2">
											<h3 className="font-semibold text-gray-900">{announcement.title}</h3>
											<span className="text-xs text-gray-500">
												{format(announcement.createdAt, 'yyyy/MM/dd HH:mm', { locale: zhTW })}
											</span>
										</div>
										<p className="text-sm text-gray-600 whitespace-pre-wrap mb-2">
											{announcement.body}
										</p>
										<div className="flex items-center gap-4 text-xs text-gray-500">
											<span>
												發送者：{announcement.sender.nickname || announcement.sender.name || '未知'}
											</span>
											<span>
												成功發送：{announcement.sentCount} / {announcement.totalCount} 位用戶
											</span>
										</div>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	)
}