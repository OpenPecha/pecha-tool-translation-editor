import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslate } from "@tolgee/react";

interface ModalFooterProps {
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  confirmVariant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  className?: string;
  layout?: "space-between" | "end";
}

export function ModalFooter({
  onCancel,
  onConfirm,
  confirmText,
  cancelText,
  confirmDisabled = false,
  confirmLoading = false,
  confirmVariant = "default",
  className,
  layout = "space-between",
}: ModalFooterProps) {
  const { t } = useTranslate();

  return (
    <div
      className={cn(
        "flex gap-3 pt-6 mt-6 border-t border-gray-100",
        layout === "space-between" ? "justify-between" : "justify-end",
        className
      )}
    >
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
      >
        {cancelText || t("common.cancel")}
      </Button>
      <Button
        type="button"
        variant={confirmVariant}
        onClick={onConfirm}
        disabled={confirmDisabled || confirmLoading}
        className={cn(
          "px-6 py-2 transition-colors",
          confirmVariant === "default" &&
            "bg-blue-600 hover:bg-blue-700 text-white"
        )}
      >
        {confirmLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {confirmText || t("common.create")}
          </div>
        ) : (
          confirmText || t("common.create")
        )}
      </Button>
    </div>
  );
}
