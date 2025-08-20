import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getDisplayName } from '@/lib/displayName'
import ImageThumb from '@/components/ImageThumb'

export default async function MemberProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const user = await prisma.user.findUnique({ where: { id }, include: { memberProfile: true } })
	if (!user) {
		return (
			<div className="max-w-2xl mx-auto p-4">
				<div className="mb-4"><Link href="/group" className="text-blue-600 underline">返回成員名單</Link></div>
				<div className="text-gray-700">找不到成員</div>
			</div>
		)
	}
	const mp = user.memberProfile
	const display = getDisplayName(user)
	return (
		<div className="max-w-2xl mx-auto p-4 space-y-5">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">{display}</h1>
				<Link href="/group" className="text-blue-600 underline text-sm">返回成員名單</Link>
			</div>

			<section className="space-y-2">
				<h2 className="font-medium">基本資料</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
					<div><div className="text-gray-500">姓名</div><div>{user.name ?? '-'}</div></div>
					<div><div className="text-gray-500">暱稱</div><div>{(user as unknown as { nickname?: string }).nickname ?? '-'}</div></div>
					<div><div className="text-gray-500">Email</div><div>{user.email}</div></div>
					<div><div className="text-gray-500">電話</div><div>{user.phone ?? '-'}</div></div>
					<div><div className="text-gray-500">生日</div><div>{mp?.birthday ? new Date(mp.birthday).toLocaleDateString('zh-TW') : '-'}</div></div>
					<div className="md:col-span-2"><div className="text-gray-500">個人簡介</div><div className="whitespace-pre-wrap">{mp?.bio ?? '-'}</div></div>
				</div>
			</section>

			<section className="space-y-2">
				<h2 className="font-medium">工作資訊</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
					<div><div className="text-gray-500">職業/代表</div><div>{mp?.occupation ?? '-'}</div></div>
					<div><div className="text-gray-500">公司</div><div>{mp?.companyName ?? '-'}</div></div>
					<div><div className="text-gray-500">公司網址</div><div>{mp?.companyWebsite ?? '-'}</div></div>
					<div><div className="text-gray-500">工作地點</div><div>{mp?.workLocation ?? '-'}</div></div>
					<div className="md:col-span-2"><div className="text-gray-500">服務項目</div><div className="whitespace-pre-wrap">{mp?.workDescription ?? '-'}</div></div>
				</div>
			</section>

			{Array.isArray(mp?.businessCards) && (mp!.businessCards as unknown[]).length > 0 ? (
				<section className="space-y-2">
					<h2 className="font-medium">名片</h2>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
						{(mp!.businessCards as string[]).map(url => (
							<div key={url} className="h-40">
								<ImageThumb url={url} variant="card" />
							</div>
						))}
					</div>
				</section>
			) : null}

			{Array.isArray(mp?.portfolioPhotos) && (mp!.portfolioPhotos as unknown[]).length > 0 ? (
				<section className="space-y-2">
					<h2 className="font-medium">作品照片</h2>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
						{(mp!.portfolioPhotos as string[]).map(url => (
							<div key={url} className="h-40">
								<ImageThumb url={url} variant="photo" />
							</div>
						))}
					</div>
				</section>
			) : null}
		</div>
	)
}
