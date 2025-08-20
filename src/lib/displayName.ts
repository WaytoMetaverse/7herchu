export function getDisplayName(user: { name?: string | null; nickname?: string | null } | null | undefined): string {
	if (!user) return '會員'
	const nick = (user.nickname || '').trim()
	if (nick) return nick
	const name = (user.name || '').trim()
	if (!name) return '會員'
	return name.length <= 2 ? name : name.slice(-2)
}
