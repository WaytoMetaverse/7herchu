import Link from 'next/link'

export default function GroupHomePage() {
	return (
		<div className="max-w-4xl mx-auto p-4 space-y-4">
			<h1 className="text-2xl lg:text-3xl font-semibold">小組管理</h1>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Link href="/admin/members" className="block border rounded p-4 hover:bg-gray-50">
					<div className="font-medium">成員名單（權限）</div>
					<div className="text-sm text-gray-600">管理內部成員、指派簽到與財務權限</div>
				</Link>
				<Link href="/admin/finance" className="block border rounded p-4 hover:bg-gray-50">
					<div className="font-medium">財務管理</div>
					<div className="text-sm text-gray-600">檢視帳務、月結與單次費用</div>
				</Link>
			</div>
		</div>
	)
}


