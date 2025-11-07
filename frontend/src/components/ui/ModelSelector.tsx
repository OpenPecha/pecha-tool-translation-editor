import React from "react";
import { Bot } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSafeValueChangeHandler } from "@/components/ui/select-helpers";
import { useModels } from "@/hooks/useModels";
import type { ModelName } from "@/api/translate";

export interface ModelSelectorProps {
  /** Current selected model value */
  value: ModelName;
  /** Callback when model selection changes */
  onValueChange: (value: ModelName) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Size variant of the selector */
  size?: "sm" | "default";
  /** Whether to show the Bot icon */
  showIcon?: boolean;
  /** Custom placeholder text */
  placeholder?: string;
  /** Display style for model options */
  displayStyle?: "simple" | "detailed" | "compact";
  /** Custom className for the trigger */
  className?: string;
}

/**
 * Reusable model selector component with consistent behavior across the app
 */
export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onValueChange,
  disabled = false,
  size = "default",
  showIcon = false,
  placeholder,
  displayStyle = "simple",
  className,
}) => {
  const {
    models,
    isLoading: isLoadingModels,
    error: modelsError,
  } = useModels();

  // Helper function to render model options based on display style
  const renderModelOptions = () => {
    if (modelsError) {
      return (
        <SelectItem value="__error__" disabled>
          Error loading models
        </SelectItem>
      );
    }

    if (isLoadingModels) {
      return (
        <SelectItem value="__loading__" disabled>
          Loading models...
        </SelectItem>
      );
    }

    if (models.length > 0) {
      return models.map((model) => (
        <SelectItem key={model.value} value={model.value}>
          {displayStyle === "simple" && (
            <span className="font-medium">{model.value}</span>
          )}

          {displayStyle === "compact" && (
            <div className="flex flex-col">
              <span className="font-medium">{model.value}</span>
              <span className="text-xs text-gray-500">{model.provider}</span>
            </div>
          )}

          {displayStyle === "detailed" && (
            <div className="flex flex-col">
              <span className="font-medium">{model.name}</span>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{model.provider}</span>
                <span>•</span>
                <span>{model.contextWindow.toLocaleString()} tokens</span>
              </div>
            </div>
          )}
        </SelectItem>
      ));
    }

    return (
      <SelectItem value="__no_models__" disabled>
        No models available
      </SelectItem>
    );
  };

  // Determine placeholder text
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    if (isLoadingModels) return "Loading models...";
    return "Select model";
  };

  // Determine trigger classes based on size
  const getTriggerClasses = () => {
    const baseClasses = className || "";

    if (size === "sm") {
      return `w-auto min-w-[180px] h-7 text-xs bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${baseClasses}`;
    }

    return `h-9 ${baseClasses}`;
  };

  return (
    <div className="flex items-center gap-2">
      {showIcon && <Bot className="w-4 h-4 text-gray-500 dark:text-gray-400" />}

      <Select
        value={value}
        onValueChange={createSafeValueChangeHandler(onValueChange)}
        disabled={disabled || isLoadingModels}
      >
        <SelectTrigger size={size} className={getTriggerClasses()}>
          <SelectValue placeholder={getPlaceholder()} />
        </SelectTrigger>

        <SelectContent>{renderModelOptions()}</SelectContent>
      </Select>
    </div>
  );
};
