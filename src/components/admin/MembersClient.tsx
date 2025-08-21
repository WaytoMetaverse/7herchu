'use client'
import Button from '@/components/ui/Button'

type Member = {
	id: string
	name: string
	memberProfile: {
		type: 'FIXED' | 'SINGLE'
	} | null
	monthlyPayments: Array<{
		month: string
		paid: boolean
	}>
}

export function PaymentMessageCopy({ message }: { message: string }) {
	return (
		<Button 
			onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
				navigator.clipboard.writeText(message)
				const btn = e.target as HTMLButtonElement
				if (btn) {
					const original = btn.textContent
					btn.textContent = '已複製！'
					setTimeout(() => { btn.textContent = original }, 2000)
				}
			}}
			variant="secondary" 
			size="sm"
		>
			複製訊息
		</Button>
	)
}

export function MembersTable({ 
	members, 
	months, 
	updateMemberType, 
	updatePaymentStatus 
}: { 
	members: Member[]
	months: string[]
	updateMemberType: (formData: FormData) => void
	updatePaymentStatus: (formData: FormData) => void
}) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead className="bg-gray-50">
					<tr>
						<th className="px-4 py-3 text-left font-medium">成員</th>
						<th className="px-4 py-3 text-center font-medium">類型</th>
						{months.map(month => (
							<th key={month} className="px-4 py-3 text-center font-medium">
								{month.slice(5)}月
							</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-200">
					{members.map(member => (
						<tr key={member.id}>
							<td className="px-4 py-3 font-medium">{member.name}</td>
							<td className="px-4 py-3 text-center">
								<form action={updateMemberType} className="inline">
									<input type="hidden" name="userId" value={member.id} />
									<select 
										name="type" 
										defaultValue={member.memberProfile?.type || 'SINGLE'}
										onChange={(e) => {
											const form = e.target.closest('form') as HTMLFormElement
											form.requestSubmit()
										}}
										className="px-2 py-1 border rounded text-xs"
									>
										<option value="FIXED">固定</option>
										<option value="SINGLE">單次</option>
									</select>
								</form>
							</td>
							{months.map(month => {
								const payment = member.monthlyPayments.find(p => p.month === month)
								const isPaid = payment?.paid || false
								const memberType = member.memberProfile?.type || 'SINGLE'
								
								return (
									<td key={month} className="px-4 py-3 text-center">
										{memberType === 'FIXED' ? (
											<form action={updatePaymentStatus} className="inline">
												<input type="hidden" name="userId" value={member.id} />
												<input type="hidden" name="month" value={month} />
												<input type="hidden" name="paid" value={(!isPaid).toString()} />
												<Button
													type="submit"
													variant={isPaid ? 'secondary' : 'danger'}
													size="sm"
													className={isPaid ? 'text-green-700 bg-green-50 hover:bg-green-100' : ''}
												>
													{isPaid ? '已繳費' : '未繳費'}
												</Button>
											</form>
										) : (
											<span className="text-gray-400">-</span>
										)}
									</td>
								)
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
