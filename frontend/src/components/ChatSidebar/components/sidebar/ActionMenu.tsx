import { useTranslation } from "react-i18next";
import {
  Check,
  Copy,
  MoreHorizontal,
  RotateCcw,
  Edit3,
  Eye,
  EyeOff,
} from "lucide-react";
import type React from "react";
import { TbReplaceFilled } from "react-icons/tb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipWrapper } from "@/components/TooltipWrapper";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TranslationResult {
  id: string;
  originalText: string;
  translatedText: string;
  timestamp: string;
  metadata?: {
    batch_id?: string;
    model_used?: string;
    text_type?: string;
  };
  previousTranslatedText?: string;
  isUpdated?: boolean;
  lineNumbers?: Record<string, { from: number; to: number }> | null;
}

interface ActionMenuProps {
  result: TranslationResult;
  currentText: string;
  isCopied: boolean;
  isEdited: boolean;
  isExpanded: boolean;
  canInsert: boolean;
  onCopy: () => void;
  onInsert: () => void;
  onEdit: () => void;
  onReset: () => void;
  onToggleExpand: () => void;
  disabled?: boolean;
}

const ActionMenu: React.FC<ActionMenuProps> = ({
  result,
  currentText,
  isCopied,
  isEdited,
  isExpanded,
  canInsert,
  onCopy,
  onInsert,
  onEdit,
  onReset,
  onToggleExpand,
  disabled = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1 relative">
      {/* Primary Actions - Always Visible */}
      <TooltipProvider>
        <Tooltip delayDuration={5}>
          <TooltipTrigger>
            <Button
              onClick={onCopy}
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 transition-colors ${
                isCopied
                  ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              disabled={disabled}
            >
              {isCopied ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isCopied ? "Copied" : "Copy to clipboard"}
          </TooltipContent>
        </Tooltip>
        {canInsert && (
          <Tooltip delayDuration={5}>
            <TooltipTrigger>
              <Button
                onClick={onInsert}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                disabled={disabled}
              >
                <TbReplaceFilled className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Insert translation at line position</TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
};

export default ActionMenu;
