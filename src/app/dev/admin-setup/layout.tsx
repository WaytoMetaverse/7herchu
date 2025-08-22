export const metadata = {
  title: '管理員設定',
  description: '將當前登入帳號設為系統管理員',
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
}

export default function AdminSetupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
