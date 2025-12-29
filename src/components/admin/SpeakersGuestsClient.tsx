'use client'
import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

type Profile = {
	id: string
	role: 'GUEST' | 'SPEAKER'
	lastEventDate: Date
	name: string
	phone: string
	companyName: string
	industry: string
	bniChapter: string
	invitedBy: string
	noteCount: number
}

type SortField = 'role' | 'lastEventDate' | 'name' | 'companyName' | 'industry' | 'bniChapter' | 'invitedBy'

export default function SpeakersGuestsClient({
	profiles,
	initialQ,
	initialSortBy,
	initialSortOrder,
	isAdmin
}: {
	profiles: Profile[]
	initialQ: string
	initialSortBy: string
	initialSortOrder: 'asc' | 'desc'
	isAdmin: boolean
}) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [q, setQ] = useState(initialQ)
	const [sortBy, setSortBy] = useState<SortField>(initialSortBy as SortField)
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder)
	const [isPending, startTransition] = useTransition()

	function handleSearch(e: React.FormEvent) {
		e.preventDefault()
		const params = new URLSearchParams()
		if (q) params.set('q', q)
		params.set('sortBy', sortBy)
		params.set('sortOrder', sortOrder)
		startTransition(() => {
			router.push(`/admin/speakers-guests?${params.toString()}`)
		})
	}

	function handleSort(field: SortField) {
		const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc'
		setSortBy(field)
		setSortOrder(newOrder)
		const params = new URLSearchParams(searchParams.toString())
		params.set('sortBy', field)
		params.set('sortOrder', newOrder)
		startTransition(() => {
			router.push(`/admin/speakers-guests?${params.toString()}`)
		})
	}

	function SortIcon({ field }: { field: SortField }) {
		if (sortBy !== field) return <span className="text-gray-400">↕</span>
		return sortOrder === 'asc' ? <span>↑</span> : <span>↓</span>
	}

	return (
		<div className="space-y-4">
			{/* 搜尋欄位 */}
			<form onSubmit={handleSearch} className="flex items-center gap-2">
				<input
					type="text"
					value={q}
					onChange={(e) => setQ(e.target.value)}
					placeholder="搜尋姓名、手機、公司、產業、BNI分會、邀請人..."
					className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				/>
				<Button type="submit" disabled={isPending}>
					{isPending ? '搜尋中...' : '搜尋'}
				</Button>
			</form>

			{/* 列表 */}
			<div className="bg-white rounded-lg border overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th 
									className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
									onClick={() => handleSort('role')}
								>
									<div className="flex items-center gap-2">
										來賓/講師
										<SortIcon field="role" />
									</div>
								</th>
								<th 
									className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
									onClick={() => handleSort('lastEventDate')}
								>
									<div className="flex items-center gap-2">
										參加日期
										<SortIcon field="lastEventDate" />
									</div>
								</th>
								<th 
									className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
									onClick={() => handleSort('name')}
								>
									<div className="flex items-center gap-2">
										姓名
										<SortIcon field="name" />
									</div>
								</th>
								<th 
									className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
									onClick={() => handleSort('companyName')}
								>
									<div className="flex items-center gap-2">
										公司名稱
										<SortIcon field="companyName" />
									</div>
								</th>
								<th 
									className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
									onClick={() => handleSort('industry')}
								>
									<div className="flex items-center gap-2">
										產業
										<SortIcon field="industry" />
									</div>
								</th>
								<th 
									className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
									onClick={() => handleSort('bniChapter')}
								>
									<div className="flex items-center gap-2">
										BNI分會
										<SortIcon field="bniChapter" />
									</div>
								</th>
								<th 
									className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100"
									onClick={() => handleSort('invitedBy')}
								>
									<div className="flex items-center gap-2">
										邀請人
										<SortIcon field="invitedBy" />
									</div>
								</th>
								<th className="px-4 py-3 text-left font-medium">詳細</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{profiles.length === 0 ? (
								<tr>
									<td colSpan={8} className="px-4 py-8 text-center text-gray-500">
										沒有資料
									</td>
								</tr>
							) : (
								profiles.map((profile) => (
									<tr key={profile.id} className="hover:bg-gray-50">
										<td className="px-4 py-3">
											<span className={`px-2 py-1 rounded text-xs ${
												profile.role === 'SPEAKER' 
													? 'bg-blue-100 text-blue-700' 
													: 'bg-purple-100 text-purple-700'
											}`}>
												{profile.role === 'SPEAKER' ? '講師' : '來賓'}
											</span>
										</td>
										<td className="px-4 py-3 text-gray-700">
											{format(new Date(profile.lastEventDate), 'yyyy/MM/dd', { locale: zhTW })}
										</td>
										<td className="px-4 py-3 font-medium">{profile.name}</td>
										<td className="px-4 py-3 text-gray-700">{profile.companyName || '-'}</td>
										<td className="px-4 py-3 text-gray-700">{profile.industry || '-'}</td>
										<td className="px-4 py-3 text-gray-700">{profile.bniChapter || '-'}</td>
										<td className="px-4 py-3 text-gray-700">{profile.invitedBy || '-'}</td>
										<td className="px-4 py-3">
											<Button 
												as={Link} 
												href={`/admin/speakers-guests/${profile.id}`}
												variant="outline" 
												size="sm"
											>
												詳細
											</Button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	)
}

