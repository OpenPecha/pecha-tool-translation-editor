import { AlertCircle, Bot, CheckCircle, Clock, User } from "lucide-react"
import type { ChatMessage as ChatMessageType } from "../types/chatTypes"

interface ChatMessageProps {
	message: ChatMessageType
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
	const isUser = message.type === "user"
	const isError = message.type === "error"

	const formatTime = (date: Date) => {
		return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
	}

	const getStatusIcon = () => {
		if (message.status === "pending") {
			return <Clock className="w-3 h-3 text-yellow-500 animate-pulse" />
		}
		if (message.status === "completed") {
			return <CheckCircle className="w-3 h-3 text-green-500" />
		}
		if (message.status === "error") {
			return <AlertCircle className="w-3 h-3 text-red-500" />
		}
		return null
	}

	const getMessageStyles = () => {
		if (isUser) {
			return {
				container: "flex justify-end mb-4",
				bubble:
					" bg-blue-500 text-white rounded-lg rounded-br-sm px-4 py-2 shadow-sm",
				meta: "flex items-center justify-end gap-1 mt-1 text-xs text-gray-500",
			}
		}

		if (isError) {
			return {
				container: "flex justify-start mb-4",
				bubble:
					"max-w-[80%] bg-red-50 border border-red-200 text-red-800 rounded-lg rounded-bl-sm px-4 py-2 shadow-sm",
				meta: "flex items-center gap-1 mt-1 text-xs text-red-500",
			}
		}

		// System/command-response
		return {
			container: "flex justify-start mb-4",
			bubble:
				"max-w-[80%] bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg rounded-bl-sm px-4 py-2 shadow-sm border border-gray-200 dark:border-gray-700",
			meta: "flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400",
		}
	}

	const styles = getMessageStyles()

	const getMessageIcon = () => {
		if (isUser) {
			return <User className="w-3 h-3" />
		}
		if (isError) {
			return <AlertCircle className="w-3 h-3" />
		}
		return <Bot className="w-3 h-3" />
	}

	return (
		<div className={styles.container}>
			<div className="flex flex-col max-w-full">
				<div className={styles.bubble}>
					<div className="whitespace-pre-wrap break-words">
						{message.content}
					</div>
					{message.command && (
						<div className="text-xs opacity-75 mt-1">
							Command: #{message.command}
						</div>
					)}
				</div>

				<div className={styles.meta}>
					{getMessageIcon()}
					<span>{formatTime(message.timestamp)}</span>
					{getStatusIcon()}
				</div>
			</div>
		</div>
	)
}

export default ChatMessage
