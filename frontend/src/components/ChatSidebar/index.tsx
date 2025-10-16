import {
	ChevronRight,
	Eye,
	MapPin,
	MessageSquare,
	Trash2,
	X,
} from "lucide-react"
import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { useEditor } from "@/contexts/EditorContext"
import {
	TranslationSidebarProvider,
	useTranslationSidebar,
} from "../TranslationSidebar/contexts/TranslationSidebarContext"
import ActionableMessage from "./components/ActionableMessage"
import ChatHistory from "./components/ChatHistory"
import ChatInput from "./components/ChatInput"
import ResultsPanel from "./components/ResultsPanel"
import { useChatFlow } from "./hooks/useChatFlow"

interface ChatSidebarProps {
	documentId: string
}

const ChatSidebarContent: React.FC = () => {
	const [isCollapsed, setIsCollapsed] = useState(false)
	const [isProcessing, setIsProcessing] = useState(false)

	const {
		messages,
		clearHistory,
		messageCount,
		handleSendMessage,
		handleAction,
	} = useChatFlow()

	const {
		selectedText,
		activeSelectedEditor,
		selectedTextLineNumbers,
		clearSelection,
		resetTranslations,
		resetGlossary,
	} = useTranslationSidebar()
	const { getQuill } = useEditor()

	// Helper function to extract start and end line numbers from selectedTextLineNumbers
	const getLineRange = (
		lineNumbers: Record<string, { from: number; to: number }> | null,
	): { startLine: number; endLine: number } | null => {
		if (!lineNumbers) return null

		const lineNums = Object.keys(lineNumbers)
			.map(Number)
			.sort((a, b) => a - b)
		if (lineNums.length === 0) return null

		return {
			startLine: lineNums[0],
			endLine: lineNums[lineNums.length - 1],
		}
	}

	// Helper function to create truncated preview text
	const createTruncatedPreview = (
		text: string,
		lineRange: { startLine: number; endLine: number } | null,
	): string => {
		if (!text || !lineRange) return ""

		const words = text.trim().split(/\s+/)
		const firstWords = words.slice(0, 4).join(" ") // Get first 4 words
		const lineRangeText =
			lineRange.startLine === lineRange.endLine
				? `(${lineRange.startLine})`
				: `(${lineRange.startLine}-${lineRange.endLine})`

		if (words.length > 4) {
			return `${firstWords}...${lineRangeText}`
		} else {
			return `${firstWords}${lineRangeText}`
		}
	}

	// Function to scroll to the selected text in the editor
	const scrollToSelectedText = () => {
		if (!selectedTextLineNumbers || !activeSelectedEditor) return

		const quill = getQuill(activeSelectedEditor)
		if (!quill) return

		const lineRange = getLineRange(selectedTextLineNumbers)
		if (!lineRange) return

		// Get the editor container and line numbers container
		const editorElement = quill.root
		const editorContainer = editorElement.closest(".editor-container")
		if (!editorContainer) return

		const lineNumbersContainer = editorContainer.querySelector(".line-numbers")
		if (!lineNumbersContainer) return

		// Find the line number element for the start line
		const targetLineElement = lineNumbersContainer.querySelector(
			`[data-line-number="${lineRange.startLine}"]`,
		)
		if (targetLineElement) {
			targetLineElement.scrollIntoView({
				behavior: "smooth",
				block: "center",
			})
		}
	}

	const handleClearChat = useCallback(() => {
		if (
			window.confirm(
				"Are you sure you want to clear the chat history and reset all results?",
			)
		) {
			clearHistory()
			resetTranslations()
			resetGlossary()
		}
	}, [clearHistory, resetTranslations, resetGlossary])

	if (isCollapsed) {
		return (
			<div className="h-full w-12 flex flex-col bg-neutral-50 dark:bg-neutral-800 border-l border-gray-200 dark:border-gray-700">
				<div className="p-2 flex flex-col items-center gap-4">
					<Button
						onClick={() => setIsCollapsed(false)}
						variant="ghost"
						size="icon"
						className="w-8 h-8 hover:bg-gray-100 dark:hover:bg-gray-700"
						title="Open Chat Assistant"
					>
						<MessageSquare className="w-4 h-4" />
					</Button>

					{/* Text selection indicator */}
					{selectedText ? (
						<div
							className="w-3 h-3 bg-blue-500 rounded-full"
							title="Text selected"
						/>
					) : (
						<div
							className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"
							title="No text selected"
						/>
					)}

					{messageCount > 0 && (
						<div
							className="w-2 h-2 bg-green-500 rounded-full animate-pulse"
							title={`${messageCount} messages`}
						/>
					)}
				</div>
			</div>
		)
	}

	return (
		<div className="h-full w-96 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
			{/* Header */}
			<div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
				<Button
					onClick={() => setIsCollapsed(true)}
					variant="ghost"
					size="icon"
					className="w-6 h-6 hover:bg-gray-100 dark:hover:bg-gray-700"
					title="Collapse chat"
				>
					<ChevronRight className="w-3 h-3" />
				</Button>

				<div className="flex items-center gap-2">
					<MessageSquare className="w-4 h-4 text-blue-500" />
					<h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
						AI
					</h3>
				</div>

				{messageCount > 0 && (
					<Button
						onClick={handleClearChat}
						variant="ghost"
						size="icon"
						className="w-6 h-6 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600"
						title="Clear chat history and reset results"
					>
						<Trash2 className="w-3 h-3" />
					</Button>
				)}
			</div>

			{/* Selected Text Display */}
			<TooltipProvider>
				{selectedText ? (
					<div className="border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-950/20 p-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 min-w-0 flex-1">
								<MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
								<div className="min-w-0 flex-1">
									<div className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
										Selected Text
									</div>
									<Tooltip>
										<TooltipTrigger asChild>
											<div className="text-sm text-blue-800 dark:text-blue-200 truncate">
												{createTruncatedPreview(
													selectedText,
													getLineRange(selectedTextLineNumbers),
												)}
											</div>
										</TooltipTrigger>
										<TooltipContent
											side="left"
											className="max-w-xs max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
										>
											<div className="whitespace-pre-wrap break-words text-xs">
												{selectedText}
											</div>
										</TooltipContent>
									</Tooltip>
								</div>
							</div>
							<div className="flex items-center gap-1">
								<Button
									onClick={scrollToSelectedText}
									variant="ghost"
									size="sm"
									className="h-6 px-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
									title="Go to text in editor"
								>
									<Eye className="w-3 h-3" />
								</Button>
								<Button
									onClick={clearSelection}
									variant="ghost"
									size="sm"
									className="h-6 px-1 text-blue-600 dark:text-blue-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400"
									title="Clear selected text"
								>
									<X className="w-3 h-3" />
								</Button>
							</div>
						</div>
					</div>
				) : (
					<div className="border-b border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-950/20 p-3">
						<div className="flex items-center gap-2">
							<MapPin className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
							<div className="text-sm text-yellow-800 dark:text-yellow-200">
								No text selected. Please select text in the editor to use
								commands.
							</div>
						</div>
					</div>
				)}
			</TooltipProvider>

			{/* Chat Area */}
			<div className="flex-1 flex flex-col min-h-0">
				<ChatHistory
					messages={messages}
					isProcessing={isProcessing}
					onAction={handleAction}
				/>

				{/* Results Panel */}
				<ResultsPanel />

				{/* Input Area */}
				<ChatInput
					onSendMessage={handleSendMessage}
					isProcessing={isProcessing}
				/>
			</div>
		</div>
	)
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ documentId }) => {
	return (
		<TranslationSidebarProvider documentId={documentId}>
			<ChatSidebarContent />
		</TranslationSidebarProvider>
	)
}

export default ChatSidebar
