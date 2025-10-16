import React from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmationModalProps {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	loading?: boolean;
}

export function ConfirmationModal({
	open,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	loading = false,
}: ConfirmationModalProps) {
	const handleConfirm = () => {
		console.log("Confirming");
		onConfirm();
		onClose();
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription className="text-gray-600">
						{message}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="flex gap-2 mt-4">
					<Button
						variant="outline"
						onClick={onClose}
						disabled={loading}
						className="flex-1"
					>
						{cancelText}
					</Button>
					<Button
						variant="destructive"
						onClick={handleConfirm}
						disabled={loading}
						className="flex-1 cursor-pointer"
					>
						{loading ? "Processing..." : confirmText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
