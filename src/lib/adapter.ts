import type { Adapter, AdapterAccount, AdapterUser } from 'next-auth/adapters'
import type { PrismaClient } from '@prisma/client'

export function PrismaUserAdapter(prisma: PrismaClient): Adapter {
	return {
		// User
		createUser: async (data: Pick<AdapterUser, 'email' | 'name'>) => {
			const user = await prisma.user.create({ data: { email: data.email!, name: data.name || null } })
			return { id: user.id, name: user.name, email: user.email, emailVerified: null, image: null }
		},
		getUser: async (id: string) => {
			const u = await prisma.user.findUnique({ where: { id } })
			return u ? { id: u.id, name: u.name, email: u.email, emailVerified: null, image: null } : null
		},
		getUserByEmail: async (email?: string | null) => {
			if (!email) return null
			const u = await prisma.user.findUnique({ where: { email } })
			return u ? { id: u.id, name: u.name, email: u.email, emailVerified: null, image: null } : null
		},
		getUserByAccount: async ({ provider, providerAccountId }: { provider: string; providerAccountId: string }) => {
			if (provider !== 'google') return null
			const u = await prisma.user.findFirst({ where: { googleId: providerAccountId } })
			return u ? { id: u.id, name: u.name, email: u.email, emailVerified: null, image: null } : null
		},
		updateUser: async (data: Partial<AdapterUser> & { id: string }) => {
			const u = await prisma.user.update({ where: { id: data.id! }, data: { name: data.name ?? undefined, email: data.email ?? undefined } })
			return { id: u.id, name: u.name, email: u.email, emailVerified: null, image: null }
		},
		deleteUser: async (id: string) => {
			await prisma.user.delete({ where: { id } })
		},

		// Account linking (for OAuth)
		linkAccount: async (account: AdapterAccount) => {
			if (account.provider === 'google') {
				await prisma.user.update({ where: { id: account.userId }, data: { googleId: account.providerAccountId } })
			}
			return account
		},
		unlinkAccount: async ({ provider, providerAccountId }: { provider: string; providerAccountId: string }) => {
			if (provider === 'google') {
				await prisma.user.updateMany({ where: { googleId: providerAccountId }, data: { googleId: null } })
			}
		},

		// JWT session strategy in use; the following are no-ops
		createSession: async () => { throw new Error('Not used with JWT sessions') },
		getSessionAndUser: async () => { throw new Error('Not used with JWT sessions') },
		updateSession: async () => { throw new Error('Not used with JWT sessions') },
		deleteSession: async () => { throw new Error('Not used with JWT sessions') },

		// Verification tokens (not used here)
		createVerificationToken: async () => { throw new Error('Not implemented') },
		useVerificationToken: async () => { throw new Error('Not implemented') },
	}
}


