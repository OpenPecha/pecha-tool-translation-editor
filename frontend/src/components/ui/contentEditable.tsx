import React, {
	useEffect,
	useRef,
	forwardRef,
	ForwardedRef,
	RefObject,
} from "react";

type ContentEditableDivProps = {
	className?: string;
	onChange?: (e: React.FormEvent<HTMLDivElement>) => void;
	placeholder?: string;
	/** Automatically focus the div on mount */
	autoFocus?: boolean;
};

const ContentEditableDiv = forwardRef<HTMLDivElement, ContentEditableDivProps>(
	(
		{ className, onChange, placeholder, autoFocus = false },
		ref: ForwardedRef<HTMLDivElement>,
	) => {
		const innerRef = useRef<HTMLDivElement | null>(null);

		// Initialize placeholder visibility
		useEffect(() => {
			const el = innerRef.current;
			if (el) {
				if (!el.textContent?.trim()) {
					el.dataset.placeholderVisible = "true";
				}
				if (autoFocus) {
					el.focus();
				}
			}
		}, [autoFocus]);

		const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
			const text = e.currentTarget.textContent ?? "";
			e.currentTarget.dataset.placeholderVisible =
				text.trim() === "" ? "true" : "false";
			onChange?.(e);
		};

		return (
			<div
				className={className}
				contentEditable
				onInput={handleInput}
				ref={(el) => {
					innerRef.current = el;
					if (typeof ref === "function") ref(el);
					else if (ref) (ref as RefObject<HTMLDivElement>).current = el;
				}}
				data-placeholder={placeholder}
				data-placeholder-visible="false"
				suppressContentEditableWarning
			/>
		);
	},
);

export default ContentEditableDiv;
