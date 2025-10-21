'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'

type Person = {
	id: string
	name: string
	phone: string
	role?: string
	diet: string
	noBeef: boolean
	noPork: boolean
	mealCode: string | null
	suggestedDiet: string
}

export default function FixDietPage() {
	const [eventId, setEventId] = useState('cmfgunz5r000bl504jxbg774l')
	const [data, setData] = useState<{
		event?: { title: string; date: string }
		registrations: Person[]
		speakers: Person[]
		total: number
	} | null>(null)
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')

	async function loadData() {
		setLoading(true)
		setMessage('')
		try {
			const res = await fetch(`/api/dev/fix-diet?eventId=${eventId}`)
			const json = await res.json()
			if (!res.ok) {
				setMessage(`錯誤：${json.error}`)
				return
			}
			setData(json)
		} catch (e) {
			setMessage(`載入失敗：${(e as Error).message}`)
		} finally {
			setLoading(false)
		}
	}

	async function autoFix() {
		if (!data) return
		
		const confirmed = confirm(
			`確定要自動修復嗎？\n\n` +
			`這會將所有「不吃牛 且 不吃豬」的人設為素食，\n` +
			`其他人設為葷食。\n\n` +
			`共 ${data.total} 人會被更新。`
		)
		
		if (!confirmed) return

		setLoading(true)
		setMessage('')
		
		try {
			const fixes = [
				...data.registrations.map(r => ({
					type: 'registration',
					id: r.id,
					diet: r.suggestedDiet
				})),
				...data.speakers.map(s => ({
					type: 'speaker',
					id: s.id,
					diet: s.suggestedDiet
				}))
			]

			const res = await fetch('/api/dev/fix-diet', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ eventId, fixes })
			})

			const json = await res.json()
			
			if (!res.ok) {
				setMessage(`錯誤：${json.error}`)
				return
			}

			setMessage(`✓ ${json.message}`)
			// 重新載入資料
			await loadData()
			
		} catch (e) {
			setMessage(`修復失敗：${(e as Error).message}`)
		} finally {
			setLoading(false)
		}
	}

	async function manualFix(person: Person, type: 'registration' | 'speaker', newDiet: string) {
		setLoading(true)
		setMessage('')
		
		try {
			const fixes = [{ type, id: person.id, diet: newDiet }]

			const res = await fetch('/api/dev/fix-diet', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ eventId, fixes })
			})

			const json = await res.json()
			
			if (!res.ok) {
				setMessage(`錯誤：${json.error}`)
				return
			}

			setMessage(`✓ 已更新 ${person.name}`)
			await loadData()
			
		} catch (e) {
			setMessage(`更新失敗：${(e as Error).message}`)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
				<h1 className="text-2xl font-semibold mb-2">🛠️ Diet 欄位修復工具</h1>
				<p className="text-sm text-yellow-800">
					這是臨時開發工具，用於修復因餐點設定導致的 diet 欄位錯誤。
				</p>
			</div>

			<div className="bg-white border rounded-lg p-6 space-y-4">
				<div>
					<label className="block text-sm font-medium mb-2">活動 ID</label>
					<div className="flex gap-3">
						<input
							type="text"
							value={eventId}
							onChange={(e) => setEventId(e.target.value)}
							className="flex-1 px-3 py-2 border rounded-lg"
							placeholder="cmfgunz5r000bl504jxbg774l"
						/>
						<Button onClick={loadData} disabled={loading || !eventId}>
							{loading ? '載入中...' : '載入資料'}
						</Button>
					</div>
				</div>

				{message && (
					<div className={`p-3 rounded-lg ${
						message.startsWith('✓') 
							? 'bg-green-50 text-green-800' 
							: 'bg-red-50 text-red-800'
					}`}>
						{message}
					</div>
				)}
			</div>

			{data && (
				<>
					<div className="bg-white border rounded-lg p-6">
						<div className="flex items-center justify-between mb-4">
							<div>
								<h2 className="text-xl font-semibold">{data.event?.title}</h2>
								<p className="text-sm text-gray-600">
									{data.event?.date && new Date(data.event.date).toLocaleDateString('zh-TW')}
								</p>
								<p className="text-sm text-gray-600">
									共 {data.total} 人報名
								</p>
							</div>
							<Button onClick={autoFix} disabled={loading} variant="primary">
								自動修復全部
							</Button>
						</div>
					</div>

					{/* 成員列表 */}
					{data.registrations.length > 0 && (
						<div className="bg-white border rounded-lg p-6">
							<h3 className="font-semibold mb-4">成員 ({data.registrations.length})</h3>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-3 py-2 text-left">姓名</th>
											<th className="px-3 py-2 text-left">類型</th>
											<th className="px-3 py-2 text-left">當前 Diet</th>
											<th className="px-3 py-2 text-left">不吃牛/豬</th>
											<th className="px-3 py-2 text-left">建議 Diet</th>
											<th className="px-3 py-2 text-left">餐點代碼</th>
											<th className="px-3 py-2 text-center">操作</th>
										</tr>
									</thead>
									<tbody className="divide-y">
										{data.registrations.map(r => (
											<tr key={r.id} className={r.diet !== r.suggestedDiet ? 'bg-yellow-50' : ''}>
												<td className="px-3 py-2">{r.name}</td>
												<td className="px-3 py-2">
													<span className={`px-2 py-1 rounded text-xs ${
														r.role === 'MEMBER' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
													}`}>
														{r.role === 'MEMBER' ? '成員' : '來賓'}
													</span>
												</td>
												<td className="px-3 py-2">
													<span className={`px-2 py-1 rounded text-xs ${
														r.diet === 'veg' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
													}`}>
														{r.diet === 'veg' ? '素食' : '葷食'}
													</span>
												</td>
												<td className="px-3 py-2 text-xs text-gray-600">
													{r.noBeef ? '不吃牛 ' : ''}{r.noPork ? '不吃豬' : ''}
													{!r.noBeef && !r.noPork ? '-' : ''}
												</td>
												<td className="px-3 py-2">
													<span className={`px-2 py-1 rounded text-xs ${
														r.suggestedDiet === 'veg' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
													}`}>
														{r.suggestedDiet === 'veg' ? '素食' : '葷食'}
													</span>
												</td>
												<td className="px-3 py-2 text-xs">{r.mealCode || '-'}</td>
												<td className="px-3 py-2 text-center">
													{r.diet !== r.suggestedDiet && (
														<div className="flex gap-1 justify-center">
															<button
																onClick={() => manualFix(r, 'registration', 'veg')}
																disabled={loading}
																className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
															>
																→素
															</button>
															<button
																onClick={() => manualFix(r, 'registration', 'meat')}
																disabled={loading}
																className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
															>
																→葷
															</button>
														</div>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* 講師列表 */}
					{data.speakers.length > 0 && (
						<div className="bg-white border rounded-lg p-6">
							<h3 className="font-semibold mb-4">講師 ({data.speakers.length})</h3>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-3 py-2 text-left">姓名</th>
											<th className="px-3 py-2 text-left">當前 Diet</th>
											<th className="px-3 py-2 text-left">不吃牛/豬</th>
											<th className="px-3 py-2 text-left">建議 Diet</th>
											<th className="px-3 py-2 text-left">餐點代碼</th>
											<th className="px-3 py-2 text-center">操作</th>
										</tr>
									</thead>
									<tbody className="divide-y">
										{data.speakers.map(s => (
											<tr key={s.id} className={s.diet !== s.suggestedDiet ? 'bg-yellow-50' : ''}>
												<td className="px-3 py-2">{s.name}</td>
												<td className="px-3 py-2">
													<span className={`px-2 py-1 rounded text-xs ${
														s.diet === 'veg' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
													}`}>
														{s.diet === 'veg' ? '素食' : '葷食'}
													</span>
												</td>
												<td className="px-3 py-2 text-xs text-gray-600">
													{s.noBeef ? '不吃牛 ' : ''}{s.noPork ? '不吃豬' : ''}
													{!s.noBeef && !s.noPork ? '-' : ''}
												</td>
												<td className="px-3 py-2">
													<span className={`px-2 py-1 rounded text-xs ${
														s.suggestedDiet === 'veg' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
													}`}>
														{s.suggestedDiet === 'veg' ? '素食' : '葷食'}
													</span>
												</td>
												<td className="px-3 py-2 text-xs">{s.mealCode || '-'}</td>
												<td className="px-3 py-2 text-center">
													{s.diet !== s.suggestedDiet && (
														<div className="flex gap-1 justify-center">
															<button
																onClick={() => manualFix(s, 'speaker', 'veg')}
																disabled={loading}
																className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
															>
																→素
															</button>
															<button
																onClick={() => manualFix(s, 'speaker', 'meat')}
																disabled={loading}
																className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
															>
																→葷
															</button>
														</div>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</>
			)}

			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
				<h4 className="font-medium mb-2">使用說明</h4>
				<ol className="list-decimal list-inside space-y-1 text-blue-800">
					<li>輸入活動 ID，點擊「載入資料」</li>
					<li>黃色標記的列表示當前 diet 與建議值不同</li>
					<li>可以點擊「自動修復全部」一次修復所有人</li>
					<li>或使用「→素」「→葷」按鈕個別修改</li>
					<li>修復完成後，重新進入餐點管理頁面，儲存一次餐點設定</li>
				</ol>
			</div>
		</div>
	)
}

