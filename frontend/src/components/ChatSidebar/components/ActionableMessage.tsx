import type React from "react"
import { Button } from "@/components/ui/button"
import type { ChatMessage as ChatMessageType } from "../types/chatTypes"

interface ActionableMessageProps {
	message: ChatMessageType
	onAction: (action: string, message: ChatMessageType) => void
}

const ActionableMessage: React.FC<ActionableMessageProps> = ({
	message,
	onAction,
}) => {
	if (message.type !== "system" || !message.actions) {
		return null
	}

	return (
		<div className="flex justify-start mb-4">
			<div className="max-w-[70%] p-3 rounded-lg shadow-md bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
				<p className="text-sm whitespace-pre-wrap">{message.content}</p>
				<div className="flex gap-2 mt-2">
					{message.actions.map((action) => (
						<Button
							key={action.action}
							onClick={() => onAction(action.action, message)}
							size="sm"
							variant="outline"
						>
							{action.label}
						</Button>
					))}
				</div>
			</div>
		</div>
	)
}

export default ActionableMessage
