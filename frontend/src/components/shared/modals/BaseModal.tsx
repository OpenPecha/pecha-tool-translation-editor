import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
  variant?: "dialog" | "fixed";
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function BaseModal({
  open,
  onOpenChange,
  trigger,
  title,
  children,
  className,
  variant = "dialog",
  size = "md",
}: BaseModalProps) {
  const handleClose = () => onOpenChange(false);

  if (variant === "fixed") {
    return (
      <>
        {open && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div
              className={cn(
                "bg-white rounded-xl shadow-2xl w-full border border-gray-200 max-h-[90vh] overflow-hidden",
                sizeClasses[size],
                className
              )}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="rounded-full h-8 w-8 p-0 hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </Button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {children}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn(
          "flex flex-col min-h-[50vh] max-h-[90vh] overflow-hidden border-0 shadow-2xl",
          sizeClasses[size],
          size === "xl" && "w-[95%] sm:max-w-[80%]",
          size === "lg" && "w-[95%] sm:max-w-[60%]",
          className
        )}
      >
        <DialogHeader className="pb-4 border-b border-gray-100 bg-gray-50/50 -m-6 p-6 mb-6">
          <DialogTitle className="text-xl font-semibold text-gray-800">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
