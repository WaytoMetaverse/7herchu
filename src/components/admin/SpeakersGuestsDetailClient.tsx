'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

type Profile = {
	id: string
	name: string
	phone: string
	companyName: string
	industry: string
	guestType: 'PANSHI' | 'OTHER_BNI' | 'NON_BNI' | null
	bniChapter: string
	bniChapterDisplay: string
	invitedBy: string
	role: 'GUEST' | 'SPEAKER'
}

type Participation = {
	eventId: string
	eventTitle: string
	eventDate: string
	role: 'GUEST' | 'SPEAKER'
}

type Note = {
	id: string
	content: string
	creatorName: string
	createdAt: string
	createdBy: string
}

export default function SpeakersGuestsDetailClient({
	profile,
	participations,
	notes,
	currentUserId,
	isAdmin,
	addNote,
	updateNote,
	deleteNote,
	updateProfile,
	deleteProfile
}: {
	profile: Profile
	participations: Participation[]
	notes: Note[]
	currentUserId: string
	isAdmin: boolean
	addNote: (formData: FormData) => Promise<void>
	updateNote: (formData: FormData) => Promise<void>
	deleteNote: (formData: FormData) => Promise<void>
	updateProfile: (formData: FormData) => Promise<{ error?: string } | void>
	deleteProfile: (formData: FormData) => Promise<void>
}) {
	const router = useRouter()
	const [isEditing, setIsEditing] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [editForm, setEditForm] = useState({
		name: profile.name,
		phone: profile.phone,
		companyName: profile.companyName,
		industry: profile.industry,
		guestType: profile.guestType || '',
		bniChapter: profile.bniChapter,
		invitedBy: profile.invitedBy
	})
	const [newNote, setNewNote] = useState('')
	const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
	const [editingNoteContent, setEditingNoteContent] = useState('')

	async function handleUpdateProfile(e: React.FormEvent) {
		e.preventDefault()
		const formData = new FormData()
		formData.append('name', editForm.name)
		formData.append('phone', editForm.phone)
		formData.append('companyName', editForm.companyName)
		formData.append('industry', editForm.industry)
		formData.append('guestType', editForm.guestType)
		formData.append('bniChapter', editForm.bniChapter)
		formData.append('invitedBy', editForm.invitedBy)
		
		const result = await updateProfile(formData)
		if (result?.error) {
			alert(result.error)
			return
		}
		setIsEditing(false)
		router.refresh()
	}

	async function handleDeleteProfile() {
		if (!confirm('確定要刪除此人的所有資料嗎？此操作無法復原。')) return
		const formData = new FormData()
		await deleteProfile(formData)
	}

	async function handleAddNote(e: React.FormEvent) {
		e.preventDefault()
		if (!newNote.trim() || newNote.length > 100) return
		const formData = new FormData()
		formData.append('content', newNote.trim())
		await addNote(formData)
		setNewNote('')
		router.refresh()
	}

	async function handleUpdateNote(noteId: string) {
		if (!editingNoteContent.trim() || editingNoteContent.length > 100) return
		const formData = new FormData()
		formData.append('noteId', noteId)
		formData.append('content', editingNoteContent.trim())
		await updateNote(formData)
		setEditingNoteId(null)
		setEditingNoteContent('')
		router.refresh()
	}

	async function handleDeleteNote(noteId: string) {
		if (!confirm('確定要刪除此留言嗎？')) return
		const formData = new FormData()
		formData.append('noteId', noteId)
		await deleteNote(formData)
		router.refresh()
	}

	return (
		<div className="space-y-6">
			{/* 基本資料 */}
			<div className="bg-white rounded-lg border p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold">基本資料</h2>
					{isAdmin && (
						<div className="flex items-center gap-2">
							{!isEditing ? (
								<>
									<Button onClick={() => setIsEditing(true)} variant="outline" size="sm">編輯</Button>
									<Button onClick={handleDeleteProfile} variant="danger" size="sm">刪除</Button>
								</>
							) : (
								<>
									<Button onClick={() => setIsEditing(false)} variant="ghost" size="sm">取消</Button>
								</>
							)}
						</div>
					)}
				</div>

				{!isEditing ? (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						<div>
							<div className="text-gray-500 mb-1">姓名</div>
							<div className="font-medium">{profile.name}</div>
						</div>
						<div>
							<div className="text-gray-500 mb-1">手機</div>
							<div>{profile.phone}</div>
						</div>
						<div>
							<div className="text-gray-500 mb-1">公司名稱</div>
							<div>{profile.companyName || '-'}</div>
						</div>
						<div>
							<div className="text-gray-500 mb-1">產業</div>
							<div>{profile.industry || '-'}</div>
						</div>
						<div>
							<div className="text-gray-500 mb-1">BNI分會</div>
							<div>{profile.bniChapterDisplay || '-'}</div>
						</div>
						<div>
							<div className="text-gray-500 mb-1">邀請人</div>
							<div>{profile.invitedBy || '-'}</div>
						</div>
					</div>
				) : (
					<form onSubmit={handleUpdateProfile} className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium mb-1">姓名 *</label>
								<input
									type="text"
									required
									value={editForm.name}
									onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
									className="w-full px-3 py-2 border rounded"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">手機 *</label>
								<input
									type="text"
									required
									maxLength={10}
									pattern="\d{10}"
									value={editForm.phone}
									onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
									className="w-full px-3 py-2 border rounded"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">公司名稱</label>
								<input
									type="text"
									value={editForm.companyName}
									onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
									className="w-full px-3 py-2 border rounded"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">產業</label>
								<input
									type="text"
									value={editForm.industry}
									onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
									className="w-full px-3 py-2 border rounded"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">來賓類型 *</label>
								<div className="flex gap-3">
									<label className="flex items-center gap-2">
										<input
											type="radio"
											name="guestType"
											value="PANSHI"
											checked={editForm.guestType === 'PANSHI'}
											onChange={(e) => setEditForm({ ...editForm, guestType: e.target.value })}
											required
										/>
										<span className="text-sm">磐石分會</span>
									</label>
									<label className="flex items-center gap-2">
										<input
											type="radio"
											name="guestType"
											value="OTHER_BNI"
											checked={editForm.guestType === 'OTHER_BNI'}
											onChange={(e) => setEditForm({ ...editForm, guestType: e.target.value })}
											required
										/>
										<span className="text-sm">其他分會</span>
									</label>
									<label className="flex items-center gap-2">
										<input
											type="radio"
											name="guestType"
											value="NON_BNI"
											checked={editForm.guestType === 'NON_BNI'}
											onChange={(e) => setEditForm({ ...editForm, guestType: e.target.value })}
											required
										/>
										<span className="text-sm">非BNI</span>
									</label>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">BNI分會</label>
								<input
									type="text"
									value={editForm.bniChapter}
									onChange={(e) => setEditForm({ ...editForm, bniChapter: e.target.value })}
									className="w-full px-3 py-2 border rounded"
								/>
							</div>
							<div className="md:col-span-2">
								<label className="block text-sm font-medium mb-1">邀請人</label>
								<input
									type="text"
									value={editForm.invitedBy}
									onChange={(e) => setEditForm({ ...editForm, invitedBy: e.target.value })}
									className="w-full px-3 py-2 border rounded"
								/>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button type="submit" size="sm">儲存</Button>
							<Button type="button" onClick={() => setIsEditing(false)} variant="ghost" size="sm">取消</Button>
						</div>
					</form>
				)}
			</div>

			{/* 參與記錄 */}
			<div className="bg-white rounded-lg border p-6">
				<h2 className="text-lg font-semibold mb-4">參與記錄（{participations.length} 次）</h2>
				{participations.length === 0 ? (
					<div className="text-gray-500 text-center py-8">尚無參與記錄</div>
				) : (
					<div className="space-y-2">
						{participations.map((p) => (
							<div key={p.eventId} className="flex items-center justify-between p-3 border rounded-lg">
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<span className={`px-2 py-1 rounded text-xs ${
											p.role === 'SPEAKER' 
												? 'bg-blue-100 text-blue-700' 
												: 'bg-purple-100 text-purple-700'
										}`}>
											{p.role === 'SPEAKER' ? '講師' : '來賓'}
										</span>
										<span className="font-medium">{p.eventTitle}</span>
									</div>
									<div className="text-sm text-gray-600 mt-1">
										{format(new Date(p.eventDate), 'yyyy/MM/dd（EEEEE）', { locale: zhTW })}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* 留言區 */}
			<div className="bg-white rounded-lg border p-6">
				<h2 className="text-lg font-semibold mb-4">留言（{notes.length} 則）</h2>
				
				{/* 新增留言 */}
				<form onSubmit={handleAddNote} className="mb-6">
					<div className="flex items-start gap-2">
						<textarea
							value={newNote}
							onChange={(e) => setNewNote(e.target.value)}
							placeholder="輸入留言（最多100字）..."
							maxLength={100}
							rows={3}
							className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
						<Button type="submit" size="sm">新增</Button>
					</div>
					<div className="text-xs text-gray-500 mt-1">{newNote.length}/100</div>
				</form>

				{/* 留言列表 */}
				{notes.length === 0 ? (
					<div className="text-gray-500 text-center py-8">尚無留言</div>
				) : (
					<div className="space-y-3">
						{notes.map((note) => (
							<div key={note.id} className="p-3 border rounded-lg">
								{editingNoteId === note.id ? (
									<div className="space-y-2">
										<textarea
											value={editingNoteContent}
											onChange={(e) => setEditingNoteContent(e.target.value)}
											maxLength={100}
											rows={3}
											className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										/>
										<div className="flex items-center gap-2">
											<Button 
												onClick={() => handleUpdateNote(note.id)} 
												size="sm"
												disabled={!editingNoteContent.trim() || editingNoteContent.length > 100}
											>
												儲存
											</Button>
											<Button 
												onClick={() => {
													setEditingNoteId(null)
													setEditingNoteContent('')
												}} 
												variant="ghost" 
												size="sm"
											>
												取消
											</Button>
										</div>
									</div>
								) : (
									<div>
										<div className="flex items-center justify-between mb-2">
											<div className="text-sm text-gray-600">
												{note.creatorName} · {format(new Date(note.createdAt), 'MM/dd HH:mm', { locale: zhTW })}
											</div>
											<div className="flex items-center gap-2">
												{(isAdmin || note.createdBy === currentUserId) && (
													<>
														<Button 
															onClick={() => {
																setEditingNoteId(note.id)
																setEditingNoteContent(note.content)
															}} 
															variant="ghost" 
															size="sm"
														>
															編輯
														</Button>
														{isAdmin && (
															<Button 
																onClick={() => handleDeleteNote(note.id)} 
																variant="ghost" 
																size="sm"
																className="text-red-600 hover:text-red-700"
															>
																刪除
															</Button>
														)}
													</>
												)}
											</div>
										</div>
										<div className="text-gray-800 whitespace-pre-wrap">{note.content}</div>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}

