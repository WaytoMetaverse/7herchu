import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from 'next/link'
import "./globals.css";
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import UserNav from '@/components/auth/UserNav'
import MobileTabBar from '@/components/MobileTabBar'
import PWARegister from '@/components/PWARegister'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "活動管理",
  description: "活動與講師預約系統",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.jpg",
  },
  manifest: "/manifest.webmanifest",
  themeColor: "#ffffff",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '活動管理',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
};


export default async function RootLayout({ children, }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="zh-Hant">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
          <nav className="max-w-6xl mx-auto px-5 h-[64px] hidden lg:flex items-center gap-6 text-[15px] text-gray-700">
            <Link href="/" className="flex items-center gap-2 mr-4">
              <img src="/brand-mark.png" alt="磐石砌好厝" className="h-7 w-7 object-contain" />
              <span className="font-semibold tracking-wide text-xl leading-none">磐石砌好厝</span>
            </Link>
            <div className="flex items-center gap-6 ml-10">
              <Link href="/calendar" className="hover:text-black">講師預約</Link>
              <Link href="/hall" className="hover:text-black">活動大廳</Link>
              <Link href="/group" className="hover:text-black">小組管理</Link>
              <Link href="/cards" className="hover:text-black">名片庫</Link>
            </div>
            <UserNav user={session?.user ?? null} />
          </nav>
        </header>
        <main className="page-wrap lg:pt-0 lg:pb-0" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(env(safe-area-inset-bottom))' }}>
          {children}
        </main>
        <PWARegister />
        <div className="md:hidden fixed top-0 inset-x-0 h-[56px] z-40 bg-white/70 backdrop-blur flex items-center px-3 gap-2 border-b">
          <img src="/brand-mark.png" alt="磐石砌好厝" className="h-6 w-6 object-contain" />
          <span className="text-[15px] font-semibold tracking-wide">磐石砌好厝</span>
        </div>
        <MobileTabBar />
      </body>
    </html>
  );
}
