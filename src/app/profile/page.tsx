import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import fs from 'node:fs/promises'
import path from 'node:path'
import Button from '@/components/ui/Button'
import ImageThumb from '@/components/ImageThumb'
import { put } from '@vercel/blob'
import ProfileUploadClient from '@/components/ProfileUploadClient'
import DeleteButton from '@/components/DeleteButton'
import PushNotificationToggle from '@/components/PushNotificationToggle'
import { Trophy, Medal } from 'lucide-react'

async function saveProfile(formData: FormData) {
	'use server'
	const session = await getServerSession(authOptions)
	if (!session?.user?.email) redirect('/auth/signin')
	const user = await prisma.user.findUnique({ where: { email: session.user.email } })
	if (!user) redirect('/auth/signin')

	const name = String(formData.get('name') || '')
	const nickname = String(formData.get('nickname') || '')
	const phoneRaw = String(formData.get('phone') ?? '').trim()
	const phone = phoneRaw ? phoneRaw : null
	const birthday = String(formData.get('birthday') || '')
	const diet = String(formData.get('diet') || '')
	const bio = String(formData.get('bio') || '')
	const occupation = String(formData.get('occupation') || '')
	const companyName = String(formData.get('companyName') || '')
	const companyWebsite = String(formData.get('companyWebsite') || '')
	const workLocation = String(formData.get('workLocation') || '')
	const workDescription = String(formData.get('workDescription') || '')

	// 直傳回傳的 URL（優先）
	const blobCardUrls = formData.getAll('cardUrls').map(String).filter(Boolean)
	const blobPhotoUrls = formData.getAll('photoUrls').map(String).filter(Boolean)

	// 名片上傳（合併至主表單保存）
	const cardFiles = formData.getAll('cards') as File[]
	const newCardUrls: string[] = [...blobCardUrls]
	if (Array.isArray(cardFiles) && cardFiles.length > 0) {
		try {
			if (process.env.BLOB_READ_WRITE_TOKEN) {
				for (const file of cardFiles) {
					if (!file || typeof file.arrayBuffer !== 'function') continue
					const buf = Buffer.from(await file.arrayBuffer())
					const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
					const filename = `cardup_${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`
					const uploaded = await put(`uploads/${filename}`, buf, {
						access: 'public',
						addRandomSuffix: false,
						token: process.env.BLOB_READ_WRITE_TOKEN,
						contentType: file.type || 'application/octet-stream',
					})
					newCardUrls.push(uploaded.url)
				}
			} else if (!process.env.VERCEL) {
				const uploadDir = path.join(process.cwd(), 'public', 'uploads')
				await fs.mkdir(uploadDir, { recursive: true })
				for (const file of cardFiles) {
					if (!file || typeof file.arrayBuffer !== 'function') continue
					const buf = Buffer.from(await file.arrayBuffer())
					const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
					const filename = `cardup_${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`
					await fs.writeFile(path.join(uploadDir, filename), buf)
					newCardUrls.push(`/uploads/${filename}`)
				}
			} else {
				// 在 Vercel 且沒有 Blob Token：略過名片新增（直傳已處理）
			}
		} catch (e) {
			console.error('saveProfile card upload error:', e)
		}
	}

	// 作品照片上傳（合併至主表單保存）
	const photoFiles = formData.getAll('photos') as File[]
	const newPhotoUrls: string[] = [...blobPhotoUrls]
	if (Array.isArray(photoFiles) && photoFiles.length > 0) {
		try {
			if (process.env.BLOB_READ_WRITE_TOKEN) {
				for (const file of photoFiles) {
					if (!file || typeof file.arrayBuffer !== 'function') continue
					const buf = Buffer.from(await file.arrayBuffer())
					const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
					const filename = `pf_${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`
					const uploaded = await put(`uploads/${filename}`, buf, {
						access: 'public',
						addRandomSuffix: false,
						token: process.env.BLOB_READ_WRITE_TOKEN,
						contentType: file.type || 'application/octet-stream',
					})
					newPhotoUrls.push(uploaded.url)
				}
			} else if (!process.env.VERCEL) {
				const uploadDir = path.join(process.cwd(), 'public', 'uploads')
				await fs.mkdir(uploadDir, { recursive: true })
				for (const file of photoFiles) {
					if (!file || typeof file.arrayBuffer !== 'function') continue
					const buf = Buffer.from(await file.arrayBuffer())
					const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
					const filename = `pf_${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`
					await fs.writeFile(path.join(uploadDir, filename), buf)
					newPhotoUrls.push(`/uploads/${filename}`)
				}
			} else {
				// 在 Vercel 且沒有 Blob Token：略過照片新增（直傳已處理）
			}
		} catch (e) {
			console.error('saveProfile photo upload error:', e)
		}
	}

	const current = await prisma.memberProfile.findUnique({ where: { userId: user.id }, select: { businessCards: true, portfolioPhotos: true } })
	const currentCards = Array.isArray(current?.businessCards) ? (current?.businessCards as string[]) : []
	const currentPhotos = Array.isArray(current?.portfolioPhotos) ? (current?.portfolioPhotos as string[]) : []
	const nextCards = newCardUrls.length ? [...currentCards, ...newCardUrls] : currentCards
	const nextPhotos = newPhotoUrls.length ? [...currentPhotos, ...newPhotoUrls] : currentPhotos

	await prisma.user.update({ where: { id: user.id }, data: { name: name || null, nickname: nickname || null, phone } })
	await prisma.memberProfile.upsert({
		where: { userId: user.id },
		create: {
			userId: user.id,
			memberType: 'SINGLE',
			birthday: birthday ? new Date(birthday) : null,
			dietPreference: diet || null,
			bio: bio || null,
			occupation: occupation || null,
			companyName: companyName || null,
			companyWebsite: companyWebsite || null,
			workLocation: workLocation || null,
			workDescription: workDescription || null,
			...(nextCards.length ? { businessCards: nextCards } : {}),
			...(nextPhotos.length ? { portfolioPhotos: nextPhotos } : {}),
		},
		update: {
			birthday: birthday ? new Date(birthday) : null,
			dietPreference: diet || null,
			bio: bio || null,
			occupation: occupation || null,
			companyName: companyName || null,
			companyWebsite: companyWebsite || null,
			workLocation: workLocation || null,
			workDescription: workDescription || null,
			...(newCardUrls.length ? { businessCards: nextCards } : {}),
			...(newPhotoUrls.length ? { portfolioPhotos: nextPhotos } : {}),
		},
	})
	redirect('/profile?saved=true')
}

export default async function ProfilePage({ searchParams }: { searchParams?: Promise<{ saved?: string }> }) {
	const session = await getServerSession(authOptions)
	if (!session?.user?.email) redirect('/auth/signin?callbackUrl=%2Fprofile')
	const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { memberProfile: true } })
	if (!user) redirect('/auth/signin')

	const mp = user.memberProfile
	const sp = searchParams ? await searchParams : undefined
	const saved = sp?.saved === 'true'



	return (
		<div className="max-w-2xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-xl md:text-2xl font-semibold">個人資料</h1>
				<div className="flex items-center gap-2">
					<Link 
						href="/leaderboard"
						className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						<Trophy className="w-4 h-4" />
						排行榜
					</Link>
					<Link 
						href="/badges"
						className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						<Medal className="w-4 h-4" />
						獎牌
					</Link>
				</div>
			</div>
			
			{saved && (
				<div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
					<span className="text-green-600 font-semibold">✓</span>
					<span>資料已儲存成功</span>
				</div>
			)}
			
			<form id="profileForm" action={saveProfile} className="space-y-8">
				<section className="space-y-4">
					<h2 className="font-medium text-lg">基本資料</h2>
					<div className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<label className="block">
								<span className="text-sm font-medium text-gray-700 mb-1 block">姓名</span>
								<input name="name" defaultValue={user.name ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
							</label>
							<label className="block">
								<span className="text-sm font-medium text-gray-700 mb-1 block">暱稱</span>
								<input name="nickname" defaultValue={(user as unknown as { nickname?: string }).nickname ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
							</label>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<label className="block">
								<span className="text-sm font-medium text-gray-700 mb-1 block">Email</span>
								<input defaultValue={user.email} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500" />
							</label>
							<label className="block">
								<span className="text-sm font-medium text-gray-700 mb-1 block">電話</span>
								<input name="phone" defaultValue={user.phone ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
							</label>
						</div>
						<label className="block">
							<span className="text-sm font-medium text-gray-700 mb-1 block">生日</span>
							<input name="birthday" type="date" defaultValue={mp?.birthday ? new Date(mp.birthday).toISOString().slice(0,10) : ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
						</label>
						<div className="block">
							<span className="text-sm font-medium text-gray-700 mb-2 block">用餐偏好</span>
							<div className="flex items-center gap-6">
								<label className="flex items-center gap-2">
									<input type="radio" name="diet" value="meat" defaultChecked={mp?.dietPreference !== 'veg'} className="text-blue-600" /> 
									<span className="text-sm">葷食</span>
								</label>
								<label className="flex items-center gap-2">
									<input type="radio" name="diet" value="veg" defaultChecked={mp?.dietPreference === 'veg'} className="text-blue-600" /> 
									<span className="text-sm">素食</span>
								</label>
							</div>
						</div>
						<label className="block">
							<span className="text-sm font-medium text-gray-700 mb-1 block">個人簡介</span>
							<textarea name="bio" rows={4} defaultValue={mp?.bio ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical" />
						</label>
					</div>
				</section>

				<section className="space-y-4">
					<h2 className="font-medium text-lg">工作資訊</h2>
					<div className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<label className="block">
								<span className="text-sm font-medium text-gray-700 mb-1 block">職業/代表</span>
								<input name="occupation" defaultValue={mp?.occupation ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
							</label>
							<label className="block">
								<span className="text-sm font-medium text-gray-700 mb-1 block">公司</span>
								<input name="companyName" defaultValue={mp?.companyName ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
							</label>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<label className="block">
								<span className="text-sm font-medium text-gray-700 mb-1 block">公司網址</span>
								<input name="companyWebsite" defaultValue={mp?.companyWebsite ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
							</label>
							<label className="block">
								<span className="text-sm font-medium text-gray-700 mb-1 block">公司地址</span>
								<input name="workLocation" defaultValue={mp?.workLocation ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
							</label>
						</div>
						<label className="block">
							<span className="text-sm font-medium text-gray-700 mb-1 block">服務項目</span>
							<textarea name="workDescription" rows={4} defaultValue={mp?.workDescription ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical" />
						</label>
					</div>
			</section>

			<section className="space-y-4">
				<h2 className="font-medium text-lg">通知設定</h2>
				<PushNotificationToggle />
			</section>

			<section className="space-y-4">
				<h2 className="font-medium text-lg">名片</h2>
					{Array.isArray(mp?.businessCards) && (mp!.businessCards as unknown[]).length > 0 ? (
						<div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
							{(mp!.businessCards as string[]).map((url) => (
								<ImageThumb key={url} url={url} variant="card" deleteForm={(
									<DeleteButton 
										url={url}
										type="card"
										size="sm"
										className="btn-compact"
									>
										刪除
									</DeleteButton>
								)} />
							))}
						</div>
					) : null}
				</section>

				<section className="space-y-4">
					<h2 className="font-medium text-lg">作品照片</h2>
					{Array.isArray(mp?.portfolioPhotos) && (mp!.portfolioPhotos as string[]).length > 0 ? (
						<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
							{(mp!.portfolioPhotos as string[]).map((url) => (
								<ImageThumb key={url} url={url} variant="photo" deleteForm={(
									<DeleteButton 
										url={url}
										type="photo"
										size="sm"
										className="btn-compact"
									>
										刪除
									</DeleteButton>
								)} />
							))}
						</div>
					) : (
						<p className="text-sm text-gray-600">尚未上傳作品照片</p>
					)}
				</section>

				<section className="space-y-6">
					<div className="bg-gray-50 p-4 rounded-lg space-y-4">
						<h3 className="font-medium text-lg">上傳新檔案</h3>
						<div className="space-y-4">
							<div>
								<h4 className="font-medium text-gray-700 mb-2">名片上傳</h4>
								<ProfileUploadClient type="cards" />
							</div>
							<div>
								<h4 className="font-medium text-gray-700 mb-2">作品照片</h4>
								<ProfileUploadClient type="photos" />
							</div>
						</div>
					</div>
				</section>

				<div className="pt-4 border-t">
					<Button type="submit" form="profileForm" className="w-full sm:w-auto">儲存資料</Button>
				</div>
			</form>
		</div>
	)
}


