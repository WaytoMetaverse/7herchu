import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Button from '@/components/ui/Button'

const ROLE_LABEL: Record<Role, string> = {
	admin: '管理者',
	event_manager: '活動',
	menu_manager: '菜單',
	finance_manager: '財務',
	checkin_manager: '簽到',
}

async function saveRoleSet(formData: FormData) {
	'use server'
	const role = String(formData.get('role') || '') as Role
	if (!(['admin','event_manager','menu_manager','finance_manager','checkin_manager'] as const).includes(role)) return

	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles) ?? []
	if (!roles.includes('admin' as Role)) return

	const selectedIds = new Set((formData.getAll('users') as string[]).filter(Boolean))
	const users = await prisma.user.findMany({ select: { id: true, roles: true } })
	const opsRaw = users.map((u) => {
		const has = u.roles.includes(role)
		const shouldHave = selectedIds.has(u.id)
		if (has === shouldHave) return null
		const nextRoles = shouldHave ? Array.from(new Set([...u.roles, role])) : u.roles.filter(r => r !== role)
		return prisma.user.update({ where: { id: u.id }, data: { roles: { set: nextRoles } } })
	})
	const ops = opsRaw.filter((v): v is ReturnType<typeof prisma.user.update> => v !== null)
	if (ops.length) await prisma.$transaction(ops)
	revalidatePath('/admin/members')
}

export default async function MembersPage() {
	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles) ?? []
	if (!roles.includes('admin' as Role)) redirect('/group')

	const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })

	const roleToUserIds: Record<Role, Set<string>> = {
		admin: new Set(),
		event_manager: new Set(),
		menu_manager: new Set(),
		finance_manager: new Set(),
		checkin_manager: new Set(),
	}
	users.forEach(u => u.roles.forEach(r => roleToUserIds[r]?.add(u.id)))

	const pickList = users.map(u => ({ id: u.id, label: `${u.name ?? '(未命名)'} · ${u.email}` }))

	const roleOrder: Role[] = ['admin','event_manager','menu_manager','finance_manager','checkin_manager']

	return (
		<div className="max-w-4xl mx-auto p-4 space-y-6">
			<h1 className="text-2xl lg:text-3xl font-semibold">權限管理</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{roleOrder.map((role) => (
					<form key={role} action={saveRoleSet} className="border rounded p-3 text-sm space-y-3">
						<input type="hidden" name="role" value={role} />
						<div className="font-medium">{ROLE_LABEL[role]}</div>
						<div className="grid grid-cols-1 gap-2 max-h-64 overflow-auto pr-1">
							{pickList.map(p => (
								<label key={p.id} className="inline-flex items-center gap-2">
									<input type="checkbox" name="users" value={p.id} defaultChecked={roleToUserIds[role].has(p.id)} />
									<span>{p.label}</span>
								</label>
							))}
						</div>
						<Button type="submit">儲存</Button>
					</form>
				))}
			</div>
		</div>
	)
}
