import { prisma } from '@/lib/prisma'
import ShareRedirectClient from './redirect'

export async function generateMetadata() {
	const org = await prisma.orgSettings.findFirst()
	const title = '講師預約'
	const description = org?.invitationMessageSpeaker || '磐石砌好厝誠摯地邀請您一同來參與'
	const image = org?.invitationCardSpeaker || undefined
	return {
		title,
		description,
		openGraph: {
			title,
			description,
			images: image ? [{ url: image }] : undefined,
		},
	}
}

export default async function SpeakerSharePage() {
	return (
		<div className="min-h-screen flex items-center justify-center">
			<ShareRedirectClient />
			<div className="text-center text-gray-600">正在前往講師預約頁...</div>
		</div>
	)
}
