import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import fs from 'node:fs/promises'
import path from 'node:path'
import Button from '@/components/ui/Button'
import Image from 'next/image'

async function saveProfile(formData: FormData) {
	'use server'
	const session = await getServerSession(authOptions)
	if (!session?.user?.email) redirect('/auth/signin')
	const user = await prisma.user.findUnique({ where: { email: session.user.email } })
	if (!user) redirect('/auth/signin')

	const name = String(formData.get('name') || '')
	const phone = String(formData.get('phone') || '')
	const birthday = String(formData.get('birthday') || '')
	const diet = String(formData.get('diet') || '')
	const bio = String(formData.get('bio') || '')
	const occupation = String(formData.get('occupation') || '')
	const companyName = String(formData.get('companyName') || '')
	const companyWebsite = String(formData.get('companyWebsite') || '')
	const workLocation = String(formData.get('workLocation') || '')
	const workDescription = String(formData.get('workDescription') || '')

	await prisma.user.update({ where: { id: user.id }, data: { name, phone } })
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
		},
	})
	redirect('/profile')
}

export default async function ProfilePage() {
	const session = await getServerSession(authOptions)
	if (!session?.user?.email) redirect('/auth/signin')
	const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { memberProfile: true } })
	if (!user) redirect('/auth/signin')

	const mp = user.memberProfile

	async function uploadPhotos(formData: FormData) {
		'use server'
		const session = await getServerSession(authOptions)
		if (!session?.user?.email) redirect('/auth/signin')
		const user = await prisma.user.findUnique({ where: { email: session.user.email } })
		if (!user) redirect('/auth/signin')

		const files = formData.getAll('photos') as File[]
		if (!files || files.length === 0) return
		const uploadDir = path.join(process.cwd(), 'public', 'uploads')
		await fs.mkdir(uploadDir, { recursive: true })
		const urls: string[] = []
		for (const file of files) {
			if (!file || typeof file.arrayBuffer !== 'function') continue
			const buf = Buffer.from(await file.arrayBuffer())
			const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
			const filename = `pf_${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`
			await fs.writeFile(path.join(uploadDir, filename), buf)
			urls.push(`/uploads/${filename}`)
		}

		// append to existing list
		const current = await prisma.memberProfile.findUnique({ where: { userId: user.id }, select: { portfolioPhotos: true } })
		const list = Array.isArray(current?.portfolioPhotos) ? (current?.portfolioPhotos as string[]) : []
		await prisma.memberProfile.upsert({
			where: { userId: user.id },
			create: { userId: user.id, memberType: 'SINGLE', portfolioPhotos: [...list, ...urls] },
			update: { portfolioPhotos: [...list, ...urls] },
		})
		redirect('/profile')
	}

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
		// 嘗試刪除檔案（忽略錯誤）
		try {
			const filePath = path.join(process.cwd(), 'public', url.replace(/^\/+/, ''))
			await fs.unlink(filePath)
		} catch {}
		redirect('/profile')
	}

	return (
		<div className="max-w-2xl mx-auto p-4 space-y-4">
			<h1 className="text-xl font-semibold">個人資料</h1>
			<form action={saveProfile} className="space-y-6">
				<section className="space-y-3">
					<h2 className="font-medium">基本資料</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<label className="text-sm">姓名
							<input name="name" defaultValue={user.name ?? ''} className="border rounded w-full px-2 py-1" />
						</label>
						<label className="text-sm">Email
							<input defaultValue={user.email} disabled className="border rounded w-full px-2 py-1 bg-gray-50" />
						</label>
						<label className="text-sm">電話
							<input name="phone" defaultValue={user.phone ?? ''} className="border rounded w-full px-2 py-1" />
						</label>
						<label className="text-sm">生日
							<input name="birthday" type="date" defaultValue={mp?.birthday ? new Date(mp.birthday).toISOString().slice(0,10) : ''} className="border rounded w-full px-2 py-1" />
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
							<textarea name="bio" rows={4} defaultValue={mp?.bio ?? ''} className="border rounded w-full px-2 py-1" />
						</label>
					</div>
				</section>

				<section className="space-y-3">
					<h2 className="font-medium">工作資訊</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<label className="text-sm">職業
							<input name="occupation" defaultValue={mp?.occupation ?? ''} className="border rounded w-full px-2 py-1" />
						</label>
						<label className="text-sm">公司
							<input name="companyName" defaultValue={mp?.companyName ?? ''} className="border rounded w-full px-2 py-1" />
						</label>
						<label className="text-sm">公司網址
							<input name="companyWebsite" defaultValue={mp?.companyWebsite ?? ''} className="border rounded w-full px-2 py-1" />
						</label>
						<label className="text-sm">工作地點
							<input name="workLocation" defaultValue={mp?.workLocation ?? ''} className="border rounded w-full px-2 py-1" />
						</label>
						<label className="text-sm col-span-2">工作簡介
							<textarea name="workDescription" rows={4} defaultValue={mp?.workDescription ?? ''} className="border rounded w-full px-2 py-1" />
						</label>
					</div>
				</section>

				<div>
					<Button type="submit">儲存</Button>
				</div>
			</form>

			<section className="space-y-3">
				<h2 className="font-medium">作品照片</h2>
				{Array.isArray(mp?.portfolioPhotos) && (mp!.portfolioPhotos as string[]).length > 0 ? (
					<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
						{(mp!.portfolioPhotos as string[]).map((url) => (
							<div key={url} className="border rounded overflow-hidden">
								<Image src={url} alt="作品" width={640} height={240} className="w-full h-32 object-cover" />
								<form action={deletePhoto} className="p-2 text-right">
									<input type="hidden" name="url" value={url} />
									<Button type="submit" variant="destructive" size="sm">刪除</Button>
								</form>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-gray-600">尚未上傳作品照片</p>
				)}
				<form action={uploadPhotos} className="flex items-center gap-2">
					<input name="photos" type="file" multiple accept="image/*" className="text-sm" />
					<Button type="submit" variant="outline">上傳</Button>
				</form>
			</section>
		</div>
	)
}


