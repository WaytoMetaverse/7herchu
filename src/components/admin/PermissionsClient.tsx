'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import { Search, Shield, Users, DollarSign, Calendar, UtensilsCrossed, CheckCircle } from 'lucide-react'
import { Role } from '@prisma/client'

type Member = {
	id: string
	name: string
	nickname: string
	email: string
	roles: Role[]
}

const ROLE_CONFIG = {
	admin: { label: '管理者', icon: Shield, color: 'red' },
	event_manager: { label: '活動管理', icon: Calendar, color: 'blue' },
	finance_manager: { label: '財務管理', icon: DollarSign, color: 'green' },
	menu_manager: { label: '菜單管理', icon: UtensilsCrossed, color: 'orange' },
	checkin_manager: { label: '簽到管理', icon: CheckCircle, color: 'purple' }
} as const

export default function PermissionsClient({ 
	members, 
	updatePermissions 
}: { 
	members: Member[]
	updatePermissions: (formData: FormData) => void
}) {
	const [searchTerm, setSearchTerm] = useState('')
	const [memberRoles, setMemberRoles] = useState<Record<string, Role[]>>(
		Object.fromEntries(members.map(m => [m.id, m.roles]))
	)
	const [hasChanges, setHasChanges] = useState(false)

	// 顯示名稱：優先暱稱，沒有則用姓名後兩字
	const getDisplayName = (member: Member) => {
		if (member.nickname) return member.nickname
		return member.name.length >= 2 ? member.name.slice(-2) : member.name
	}

	// 過濾成員
	const filteredMembers = members.filter(member => 
		member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
		member.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
	)

	// 切換角色
	const toggleRole = (memberId: string, role: Role) => {
		setMemberRoles(prev => {
			const currentRoles = prev[memberId] || []
			const newRoles = currentRoles.includes(role)
				? currentRoles.filter(r => r !== role)
				: [...currentRoles, role]
			
			const updated = { ...prev, [memberId]: newRoles }
			setHasChanges(true)
			return updated
		})
	}

	// 儲存變更
	const handleSave = () => {
		const updates = Object.entries(memberRoles).map(([userId, roles]) => ({
			userId,
			roles
		}))

		const formData = new FormData()
		formData.append('updates', JSON.stringify(updates))
		updatePermissions(formData)
		setHasChanges(false)
	}

	// 統計各角色人數
	const roleStats = Object.values(Role).reduce((acc, role) => {
		acc[role] = Object.values(memberRoles).filter(roles => roles.includes(role)).length
		return acc
	}, {} as Record<Role, number>)

	return (
		<div className="space-y-6">
			{/* 搜尋和統計 */}
			<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
				<div className="relative flex-1 max-w-md">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
					<input
						type="text"
						placeholder="搜尋成員姓名..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>
				<div className="flex items-center gap-2 text-sm text-gray-600">
					<Users className="w-4 h-4" />
					<span>總成員：{filteredMembers.length} 人</span>
				</div>
			</div>

			{/* 角色統計 */}
			<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
				{Object.entries(ROLE_CONFIG).map(([role, config]) => {
					const Icon = config.icon
					const count = roleStats[role as Role]
					return (
						<div key={role} className="bg-white border rounded-lg p-3 text-center">
							<Icon className={`w-6 h-6 mx-auto mb-2 text-${config.color}-600`} />
							<div className="font-medium text-sm">{config.label}</div>
							<div className="text-xs text-gray-600">{count} 人</div>
						</div>
					)
				})}
			</div>

			{/* 權限表格 */}
			<div className="bg-white border rounded-lg overflow-hidden">
				<div className="overflow-x-auto" style={{ maxHeight: '60vh' }}>
					<table className="w-full text-sm">
						<thead className="bg-gray-50 sticky top-0">
							<tr>
								<th className="px-4 py-3 text-left font-medium min-w-32">成員</th>
								<th className="px-4 py-3 text-center font-medium min-w-20">管理者</th>
								<th className="px-4 py-3 text-center font-medium min-w-20">活動</th>
								<th className="px-4 py-3 text-center font-medium min-w-20">財務</th>
								<th className="px-4 py-3 text-center font-medium min-w-20">菜單</th>
								<th className="px-4 py-3 text-center font-medium min-w-20">簽到</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{filteredMembers.map(member => (
								<tr key={member.id} className="hover:bg-gray-50">
									<td className="px-4 py-3">
										<div className="font-medium">{getDisplayName(member)}</div>
										<div className="text-xs text-gray-600">{member.name}</div>
									</td>
									{Object.keys(ROLE_CONFIG).map(role => (
										<td key={role} className="px-4 py-3 text-center">
											<input
												type="checkbox"
												checked={memberRoles[member.id]?.includes(role as Role) || false}
												onChange={() => toggleRole(member.id, role as Role)}
												className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
											/>
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* 儲存按鈕 */}
			<div className="flex items-center justify-between">
				<div className="text-sm text-gray-600">
					{hasChanges && '有未儲存的變更'}
				</div>
				<Button 
					onClick={handleSave}
					disabled={!hasChanges}
					variant="primary"
				>
					儲存權限設定
				</Button>
			</div>
		</div>
	)
}
