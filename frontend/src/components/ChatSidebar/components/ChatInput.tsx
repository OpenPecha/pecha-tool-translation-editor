import { Hash, Send } from "lucide-react"
import { type KeyboardEvent, useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

interface ChatInputProps {
	onSendMessage: (message: string) => void
	disabled?: boolean
	placeholder?: string
}

const ChatInput: React.FC<ChatInputProps> = ({
	onSendMessage,
	disabled = false,
	placeholder = "Type message...",
}) => {
	const [input, setInput] = useState("")
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const isCommand = input.trim().startsWith("#")

	const handleSend = useCallback(() => {
		const message = input.trim()
		if (message && !disabled) {
			onSendMessage(message)
			setInput("")
			// Reset textarea height
			if (textareaRef.current) {
				textareaRef.current.style.height = "auto"
			}
		}
	}, [input, disabled, onSendMessage])

	const handleKeyPress = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault()
				handleSend()
			}
		},
		[handleSend],
	)

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setInput(e.target.value)

			// Auto-resize textarea
			const textarea = e.target
			textarea.style.height = "auto"
			const scrollHeight = textarea.scrollHeight
			const maxHeight = 120 // Max height before scrolling
			textarea.style.height = Math.min(scrollHeight, maxHeight) + "px"
		},
		[],
	)

	// Quick command buttons
	const quickCommands = [
		{
			command: "#translate",
			label: "Translate",
			description: "Translate selected text",
		},
		{
			command: "#glossary",
			label: "Glossary",
			description: "Extract glossary terms",
		},
	]

	const insertCommand = useCallback((command: string) => {
		setInput(command + " ")
		textareaRef.current?.focus()
	}, [])

	return (
		<div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
			{/* Quick Commands */}
			<div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
				<div className="flex gap-1 overflow-x-auto">
					{quickCommands.map((cmd) => (
						<Button
							key={cmd.command}
							variant="ghost"
							size="sm"
							onClick={() => insertCommand(cmd.command)}
							disabled={disabled}
							className="flex-shrink-0 h-7 text-xs gap-1 hover:bg-blue-50 hover:text-blue-600"
							title={cmd.description}
						>
							<Hash className="w-3 h-3" />
							{cmd.label}
						</Button>
					))}
				</div>
			</div>

			{/* Input Area */}
			<div className="p-3">
				<div className="flex gap-2 items-center">
						<textarea
							ref={textareaRef}
							value={input}
							onChange={handleInputChange}
							onKeyDown={handleKeyPress}
							placeholder={placeholder}
							disabled={disabled}
							className={`
                w-full resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                disabled:opacity-50 disabled:cursor-not-allowed
                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                placeholder:text-gray-500 dark:placeholder:text-gray-400
                min-h-[40px] max-h-[120px]
                ${isCommand ? "border-blue-300 bg-blue-50 dark:bg-blue-950" : ""}
              `}
							rows={1}
						/>

						{/* Command indicator */}
					

					<Button
						onClick={handleSend}
						disabled={disabled || !input.trim()}
						size="sm"
						className="h-10 px-3 bg-blue-500 hover:bg-blue-600 text-white"
					>
						<Send className="w-4 h-4" />
					</Button>
				</div>

				{/* Command hint */}
				{isCommand && (
					<div className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
						<Hash className="w-3 h-3" />
						Command mode - Available: #translate, #glossary
					</div>
				)}
			</div>
		</div>
	)
}

export default ChatInput
