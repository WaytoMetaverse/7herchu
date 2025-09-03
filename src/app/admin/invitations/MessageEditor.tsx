'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'

interface MessageEditorProps {
	messageType: string
	defaultMessage: string
	updateAction: (formData: FormData) => Promise<void>
}

export default function MessageEditor({ messageType, defaultMessage, updateAction }: MessageEditorProps) {
	const [message, setMessage] = useState(defaultMessage)
	
	return (
		<form action={updateAction} className="space-y-2">
			<input type="hidden" name="messageType" value={messageType} />
			<textarea
				name="message"
				value={message}
				onChange={(e) => setMessage(e.target.value)}
				placeholder="請輸入邀請訊息"
				className="w-full p-2 border rounded-lg resize-none h-20 text-sm"
			/>
			<div className="flex gap-2">
				<Button type="submit" variant="primary" size="sm">
					儲存
				</Button>
				<Button 
					type="button" 
					variant="outline" 
					size="sm"
					onClick={() => setMessage(defaultMessage || '磐石砌好厝誠摯地邀請您一同來參與')}
				>
					取消
				</Button>
			</div>
		</form>
	)
}
