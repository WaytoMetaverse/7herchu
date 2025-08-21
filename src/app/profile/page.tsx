import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import fs from 'node:fs/promises'
import path from 'node:path'
import Button from '@/components/ui/Button'
import ImageThumb from '@/components/ImageThumb'
import { put } from '@vercel/blob'
import ProfileUploadClient from '@/components/ProfileUploadClient'

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
	redirect('/profile')
}

export default async function ProfilePage() {
	const session = await getServerSession(authOptions)
	if (!session?.user?.email) redirect('/auth/signin?callbackUrl=%2Fprofile')
	const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { memberProfile: true } })
	if (!user) redirect('/auth/signin')

	const mp = user.memberProfile

	async function deletePhoto(formData: FormData) {
		'use server'
		const session = await getServerSession(authOptions)
		if (!session?.user?.email) redirect('/auth/signin')
		const user = await prisma.user.findUnique({ where: { email: session.user.email } })
		if (!user) redirect('/auth/signin')
		const url = String(formData.get('url') || '')
		if (!url) redirect('/profile')
		const mp = await prisma.memberProfile.findUnique({ where: { userId: user.id }, select: { portfolioPhotos: true } })
		const list = Array.isArray(mp?.portfolioPhotos) ? (mp?.portfolioPhotos as string[]) : []
		const next = list.filter((u) => u !== url)
		await prisma.memberProfile.update({ where: { userId: user.id }, data: { portfolioPhotos: next } })
		try {
			const filePath = path.join(process.cwd(), 'public', url.replace(/^\/+/, ''))
			await fs.unlink(filePath)
		} catch {}
		redirect('/profile')
	}

	return (
		<div className="max-w-2xl mx-auto p-4 space-y-4">
			<h1 className="text-2xl lg:text-3xl font-semibold">個人資料</h1>
			<form id="profileForm" action={saveProfile} className="space-y-6">
				<section className="space-y-3">
					<h2 className="font-medium">基本資料</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<label className="text-sm">姓名
							<input name="name" defaultValue={user.name ?? ''} />
						</label>
						<label className="text-sm">暱稱
							<input name="nickname" defaultValue={(user as unknown as { nickname?: string }).nickname ?? ''}  />
						</label>
						<label className="text-sm">Email
							<input defaultValue={user.email} disabled className="border rounded w-full px-2 py-1 bg-gray-50" />
						</label>
						<label className="text-sm">電話
							<input name="phone" defaultValue={user.phone ?? ''}  />
						</label>
						<label className="text-sm">生日
							<input name="birthday" type="date" defaultValue={mp?.birthday ? new Date(mp.birthday).toISOString().slice(0,10) : ''}  />
						</label>
						<label className="text-sm col-span-2">用餐偏好
							<div className="flex items-center gap-4 py-1">
								<label className="flex items-center gap-2">
									<input type="radio" name="diet" value="meat" defaultChecked={mp?.dietPreference !== 'veg'} /> 葷食
								</label>
								<label className="flex items-center gap-2">
									<input type="radio" name="diet" value="veg" defaultChecked={mp?.dietPreference === 'veg'} /> 素食
								</label>
							</div>
						</label>
						<label className="text-sm col-span-2">個人簡介
							<textarea name="bio" rows={4} defaultValue={mp?.bio ?? ''}  />
						</label>
					</div>
				</section>

				<section className="space-y-3">
					<h2 className="font-medium">工作資訊</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<label className="text-sm">職業/代表
							<input name="occupation" defaultValue={mp?.occupation ?? ''}  />
						</label>
						<label className="text-sm">公司
							<input name="companyName" defaultValue={mp?.companyName ?? ''}  />
						</label>
						<label className="text-sm">公司網址
							<input name="companyWebsite" defaultValue={mp?.companyWebsite ?? ''}  />
						</label>
						<label className="text-sm">工作地點
							<input name="workLocation" defaultValue={mp?.workLocation ?? ''}  />
						</label>
						<label className="text-sm col-span-2">服務項目
							<textarea name="workDescription" rows={4} defaultValue={mp?.workDescription ?? ''}  />
						</label>
					</div>
				</section>

				<section className="space-y-3">
					<h2 className="font-medium">名片上傳</h2>
					<ProfileUploadClient />
					{Array.isArray(mp?.businessCards) && (mp!.businessCards as unknown[]).length > 0 ? (
						<div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
							{(mp!.businessCards as string[]).map((url) => (
								<ImageThumb key={url} url={url} variant="card" deleteForm={(
																			<form action={async () => {
										'use server'
										const session = await getServerSession(authOptions)
										if (!session?.user?.email) return
										const user = await prisma.user.findUnique({ where: { email: session.user.email } })
										if (!user) return
										const mp = await prisma.memberProfile.findUnique({ where: { userId: user.id }, select: { businessCards: true } })
										const list = Array.isArray(mp?.businessCards) ? (mp?.businessCards as string[]) : []
										const next = list.filter((u) => u !== url)
										await prisma.memberProfile.update({ where: { userId: user.id }, data: { businessCards: next } })
									}}>
										<Button type="submit" size="sm" variant="danger" className="btn-compact">刪除</Button>
									</form>
								)} />
							))}
						</div>
					) : null}
				</section>

				<section className="space-y-3">
					<h2 className="font-medium">作品照片</h2>
					{Array.isArray(mp?.portfolioPhotos) && (mp!.portfolioPhotos as string[]).length > 0 ? (
						<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
							{(mp!.portfolioPhotos as string[]).map((url) => (
								<ImageThumb key={url} url={url} variant="photo" deleteForm={(
									<form action={deletePhoto}>
										<input type="hidden" name="url" value={url} />
										<Button type="submit" variant="danger" size="sm" className="btn-compact">刪除</Button>
									</form>
								)} />
							))}
						</div>
					) : (
						<p className="text-sm text-gray-600">尚未上傳作品照片</p>
					)}
					<div className="hidden"><input name="photos" type="file" multiple accept="image/*" /></div>
				</section>

				<div>
					<Button type="submit" form="profileForm">儲存</Button>
				</div>
			</form>
		</div>
	)
}


