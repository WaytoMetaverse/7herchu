'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import { Users, Mail, Phone, Shield } from 'lucide-react'

type Member = {
	id: string
	name: string
	nickname: string
	email: string
	phone: string
	isActive: boolean
	memberType: 'SINGLE' | 'FIXED'
	roles: string[]
}

export default function MemberListClient({ 
	members, 
	deactivateMember, 
	activateMember 
}: { 
	members: Member[]
	deactivateMember: (formData: FormData) => void
	activateMember: (formData: FormData) => void
}) {
	const [editMode, setEditMode] = useState(false)

	// 顯示名稱：優先暱稱，沒有則用姓名後兩字
	const getDisplayName = (member: Member) => {
		if (member.nickname) return member.nickname
		return member.name.length >= 2 ? member.name.slice(-2) : member.name
	}

	const activeMembers = members.filter(m => m.isActive)
	const inactiveMembers = members.filter(m => !m.isActive)

	return (
		<div className="space-y-6">
			{/* 控制按鈕 */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-sm text-gray-600">
					<Users className="w-4 h-4" />
					<span>活躍成員：{activeMembers.length} 人</span>
					{inactiveMembers.length > 0 && (
						<span className="text-gray-400">• 停用：{inactiveMembers.length} 人</span>
					)}
				</div>
				<Button 
					onClick={() => setEditMode(!editMode)}
					variant={editMode ? 'danger' : 'outline'}
					size="sm"
				>
					{editMode ? '取消編輯' : '編輯成員'}
				</Button>
			</div>

			{/* 活躍成員 */}
			<div className="space-y-4">
				<h2 className="font-medium text-lg">活躍成員</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{activeMembers.map(member => (
						<div key={member.id} className="bg-white border rounded-lg p-4 space-y-3">
							<div className="flex items-center justify-between">
								<div>
									<h3 className="font-medium">{getDisplayName(member)}</h3>
									<p className="text-sm text-gray-600">{member.name}</p>
								</div>
								{editMode && (
									<form action={deactivateMember} onSubmit={(e) => {
										if (!confirm(`確定要停用 ${member.name} 嗎？\n停用後該成員無法登入，但帳務資料會保留。`)) {
											e.preventDefault()
										}
									}}>
										<input type="hidden" name="userId" value={member.id} />
										<Button type="submit" variant="danger" size="sm">停用</Button>
									</form>
								)}
							</div>
							
							<div className="space-y-1 text-xs text-gray-500">
								<div className="flex items-center gap-1">
									<Mail className="w-3 h-3" />
									<span>{member.email}</span>
								</div>
								{member.phone && (
									<div className="flex items-center gap-1">
										<Phone className="w-3 h-3" />
										<span>{member.phone}</span>
									</div>
								)}
								{member.roles.length > 0 && (
									<div className="flex items-center gap-1">
										<Shield className="w-3 h-3" />
										<span>{member.roles.join(', ')}</span>
									</div>
								)}
							</div>

							<div className="flex items-center justify-between">
								<span className={`text-xs px-2 py-1 rounded ${
									member.memberType === 'FIXED' 
										? 'bg-blue-100 text-blue-700' 
										: 'bg-gray-100 text-gray-700'
								}`}>
									{member.memberType === 'FIXED' ? '固定成員' : '單次成員'}
								</span>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* 停用成員（如果有的話） */}
			{inactiveMembers.length > 0 && (
				<div className="space-y-4">
					<h2 className="font-medium text-lg text-gray-600">停用成員</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{inactiveMembers.map(member => (
							<div key={member.id} className="bg-gray-50 border rounded-lg p-4 space-y-3 opacity-75">
								<div className="flex items-center justify-between">
									<div>
										<h3 className="font-medium text-gray-600">{getDisplayName(member)}</h3>
										<p className="text-sm text-gray-500">{member.name}</p>
									</div>
									{editMode && (
										<form action={activateMember}>
											<input type="hidden" name="userId" value={member.id} />
											<Button type="submit" variant="secondary" size="sm">重新啟用</Button>
										</form>
									)}
								</div>
								
								<div className="space-y-1 text-xs text-gray-400">
									<div className="flex items-center gap-1">
										<Mail className="w-3 h-3" />
										<span>{member.email}</span>
									</div>
									{member.phone && (
										<div className="flex items-center gap-1">
											<Phone className="w-3 h-3" />
											<span>{member.phone}</span>
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
