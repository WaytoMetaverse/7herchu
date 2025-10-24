import { prisma } from '@/lib/prisma'
import { getAvailableBotToken } from '@/lib/line'

export default async function LineBotStatusPage() {
	const orgSettings = await prisma.orgSettings.findUnique({ where: { id: 'singleton' } })
	
	// 檢查機器人配置
	const hasPrimaryBot = !!(process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET)
	const hasBackupBot = !!(process.env.LINE_CHANNEL_ID_2 && process.env.LINE_CHANNEL_SECRET_2)
	
	// 測試機器人連接
	const { token, botName } = await getAvailableBotToken()
	
	return (
		<div className="container mx-auto p-6">
			<h1 className="text-2xl font-bold mb-6">LINE 機器人狀態監控</h1>
			
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* 機器人配置狀態 */}
				<div className="bg-white p-6 rounded-lg shadow">
					<h2 className="text-xl font-semibold mb-4">機器人配置狀態</h2>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<span className="font-medium">主要機器人</span>
							<span className={`px-3 py-1 rounded-full text-sm ${
								hasPrimaryBot ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
							}`}>
								{hasPrimaryBot ? '已配置' : '未配置'}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="font-medium">備用機器人</span>
							<span className={`px-3 py-1 rounded-full text-sm ${
								hasBackupBot ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
							}`}>
								{hasBackupBot ? '已配置' : '未配置'}
							</span>
						</div>
					</div>
				</div>
				
				{/* 當前狀態 */}
				<div className="bg-white p-6 rounded-lg shadow">
					<h2 className="text-xl font-semibold mb-4">當前狀態</h2>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<span className="font-medium">當前機器人</span>
							<span className={`px-3 py-1 rounded-full text-sm ${
								botName === 'primary' ? 'bg-blue-100 text-blue-800' : 
								botName === 'backup' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
							}`}>
								{botName === 'primary' ? '主要機器人' : 
								 botName === 'backup' ? '備用機器人' : '無可用機器人'}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="font-medium">連接狀態</span>
							<span className={`px-3 py-1 rounded-full text-sm ${
								token ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
							}`}>
								{token ? '正常' : '異常'}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="font-medium">機器人狀態</span>
							<span className={`px-3 py-1 rounded-full text-sm ${
								orgSettings?.lineBotStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
							}`}>
								{orgSettings?.lineBotStatus === 'active' ? '正常' : '異常'}
							</span>
						</div>
					</div>
				</div>
				
				{/* 詳細資訊 */}
				<div className="bg-white p-6 rounded-lg shadow md:col-span-2">
					<h2 className="text-xl font-semibold mb-4">詳細資訊</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700">群組ID</label>
							<p className="mt-1 text-sm text-gray-900 break-all">
								{orgSettings?.lineGroupId || '未綁定'}
							</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">最後切換時間</label>
							<p className="mt-1 text-sm text-gray-900">
								{orgSettings?.lastLineBotSwitch ? 
									new Date(orgSettings.lastLineBotSwitch).toLocaleString('zh-TW') : 
									'從未切換'
								}
							</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">主要機器人錯誤次數</label>
							<p className="mt-1 text-sm text-gray-900">
								{orgSettings?.primaryBotErrorCount || 0}
							</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">最後錯誤時間</label>
							<p className="mt-1 text-sm text-gray-900">
								{orgSettings?.lastPrimaryBotError ? 
									new Date(orgSettings.lastPrimaryBotError).toLocaleString('zh-TW') : 
									'無錯誤記錄'
								}
							</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">恢復嘗試次數</label>
							<p className="mt-1 text-sm text-gray-900">
								{orgSettings?.botRecoveryAttempts || 0}
							</p>
						</div>
					</div>
				</div>
			</div>
			
			{/* 使用說明 */}
			<div className="mt-8 bg-blue-50 p-6 rounded-lg">
				<h3 className="text-lg font-semibold mb-3 text-blue-900">使用說明</h3>
				<div className="text-blue-800 space-y-2">
					<p>• <strong>額度監控輪流</strong>：主要機器人正常使用，當出現額度問題時自動切換到備用機器人</p>
					<p>• <strong>智能監控</strong>：系統會監控LINE API回應，當收到429或403錯誤時會記錄錯誤次數</p>
					<p>• <strong>自動恢復</strong>：當距離最後一次錯誤超過1小時時，系統會嘗試恢復主要機器人</p>
					<p>• <strong>狀態追蹤</strong>：系統會記錄錯誤次數、切換時間和恢復嘗試次數</p>
					<p>• <strong>配置要求</strong>：需要設定LINE_CHANNEL_ID_2和LINE_CHANNEL_SECRET_2環境變數來啟用備用機器人</p>
					<p>• <strong>群組限制</strong>：兩個機器人不能在同一個群組中，需要分別綁定不同的群組</p>
				</div>
			</div>
		</div>
	)
}
