import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorDisplayProps {
  error: string;
  className?: string;
  variant?: "default" | "compact";
}

export function ErrorDisplay({
  error,
  className,
  variant = "default",
}: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4",
        variant === "compact" && "p-3 text-sm",
        className
      )}
    >
      <AlertCircle
        className={cn(
          "text-red-500 shrink-0 mt-0.5",
          variant === "compact" ? "h-4 w-4" : "h-5 w-5"
        )}
      />
      <div className="flex-1">
        <p className={cn("font-medium", variant === "compact" && "text-sm")}>
          Error
        </p>
        <p
          className={cn(
            "mt-1 text-red-600",
            variant === "compact" && "text-xs mt-0.5"
          )}
        >
          {error}
        </p>
      </div>
    </div>
  );
}
