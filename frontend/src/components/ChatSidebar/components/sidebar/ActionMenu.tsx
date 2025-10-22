import { useTranslate } from "@tolgee/react";
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
  const { t } = useTranslate();

  return (
    <div className="flex items-center gap-1">
      {/* Primary Actions - Always Visible */}
      <Button
        onClick={onCopy}
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 transition-colors ${
          isCopied
            ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
            : "hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
        title={isCopied ? t("translation.copied") : t("translation.copy")}
        disabled={disabled}
      >
        {isCopied ? (
          <Check className="w-3 h-3" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </Button>

      {canInsert && (
        <Button
          onClick={onInsert}
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          title="Insert translation at line position"
          disabled={disabled}
        >
          <TbReplaceFilled className="w-3 h-3" />
        </Button>
      )}

      {/* Secondary Actions - Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            disabled={disabled}
          >
            <MoreHorizontal className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
            <Edit3 className="w-4 h-4 mr-2" />
            {t("translation.editTranslation")}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onToggleExpand} className="cursor-pointer">
            {isExpanded ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Collapse text
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Expand text
              </>
            )}
          </DropdownMenuItem>

          {isEdited && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onReset}
                className="cursor-pointer text-orange-600 dark:text-orange-400"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {t("translation.resetToOriginal")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ActionMenu;
