import { checkIsTibetan } from "@/lib/isTibetan";
import React, { useState, useEffect } from "react";

interface EditableTextProps {
	initialText: string;
	onSave: (newText: string) => Promise<void>;
	className?: string;
	placeholder?: string;
	style?: React.CSSProperties;
	disabled?: boolean;
	allowEmpty?: boolean;
}

/**
 * Reusable component for editable text fields with auto-sizing and validation
 */
const EditableText: React.FC<EditableTextProps> = ({
	initialText,
	onSave,
	className = "",
	placeholder = "",
	style = {},
	disabled = false,
	allowEmpty = false,
}) => {
	const [inputValue, setInputValue] = useState(initialText);
	const [isLoading, setIsLoading] = useState(false);

	// Update input value when initialText changes
	useEffect(() => {
		setInputValue(initialText);
	}, [initialText]);

	// Update input value when it changes
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		if (newValue === initialText) return;
		if (!allowEmpty && newValue.trim() === "") return;
		setInputValue(newValue);
	};

	// Save changes if title has changed and is valid
	const saveChanges = async () => {
		const trimmedValue = inputValue.trim();

		// Check if value is valid
		if (!allowEmpty && !trimmedValue) {
			setInputValue(initialText); // Revert to original
			return;
		}

		// Check if value actually changed
		if (trimmedValue === initialText.trim()) {
			return;
		}

		setIsLoading(true);
		try {
			await onSave(trimmedValue);
		} catch (error) {
			console.error("Failed to save changes:", error);
			setInputValue(initialText); // Revert to original on error
		} finally {
			setIsLoading(false);
		}
	};

	// Handle form submission (Enter key)
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		saveChanges();
		// Blur the input on enter
		(document.activeElement as HTMLElement)?.blur();
	};

	// Handle blur event to save changes when focus is lost
	const handleBlur = () => {
		saveChanges();
	};
	const isTibetan = checkIsTibetan(inputValue);
	return (
		<div className="inline-block">
			<form onSubmit={handleSubmit}>
				<input
					value={inputValue}
					onChange={handleInputChange}
					onBlur={handleBlur}
					disabled={disabled || isLoading}
					placeholder={placeholder}
					className={`${className} 
           ${isTibetan ? "font-monlam text-xs leading-[normal]" : "font-google-sans"}
          ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
					style={{
						width: `${inputValue.length + 1}ch`,
						minWidth: "50px",
						...style,
					}}
				/>
			</form>
		</div>
	);
};

export default EditableText;
