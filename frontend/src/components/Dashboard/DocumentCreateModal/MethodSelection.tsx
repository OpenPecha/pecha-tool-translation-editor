import { useTranslation } from "react-i18next";
import { TbApi } from "react-icons/tb";
import { File, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { AvailableMethodType, UploadMethod } from "./types";

export function MethodSelection({
  selectedMethod,
  onMethodSelect,
  availableMethods,
  onDoubleClick,
}: {
  readonly selectedMethod: UploadMethod | null;
  readonly onMethodSelect: (method: UploadMethod) => void;
  readonly availableMethods: AvailableMethodType[];
  readonly onDoubleClick: () => void;
}) {
  const { t } = useTranslation();

  const methodConfigs = {
    empty: {
      icon: <FileText size={24} />,
      title: t("documents.emptyText"),
      description: t("documents.startEmptyDocument"),
      isDisabled: false,
    },
    file: {
      icon: <File size={24} />,
      title: t("common.file"),
      description: t("projects.uploadAFileFromYourComputer"),
      isDisabled: false,
    },
    openpecha: {
      icon: <TbApi size={24} />,
      title: t("common.openpecha"),
      description: t("projects.importFromOpenPechaRepository"),
      isDisabled: true,
    },
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-400 mb-2">
          {t(`projects.chooseInputMethod`)}
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-500">
          {t(`projects.selectHowYouWantToCreateYourProject`)}
        </p>
      </div>

      <div className="grid gap-4">
        {availableMethods.map((method) => {
          const config = methodConfigs[method.type];
          return (
            <button
              key={method.type}
              disabled={config.isDisabled}
              type="button"
              onClick={() => onMethodSelect(method.type)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onMethodSelect(method.type);
                }
              }}
              onDoubleClick={onDoubleClick}
              className={cn(
                "w-full p-6 border-2 rounded-lg text-left transition-all hover:shadow-md focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-secondary-500",
                selectedMethod === method.type
                  ? "border-secondary-500 bg-neutral-50 dark:bg-neutral-700"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="flex items-start space-x-4">
                <div
                  className={cn(
                    "p-3 rounded-lg",
                    selectedMethod === method.type
                      ? "bg-secondary-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {config.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-neutral-900 dark:text-neutral-300 mb-1">
                    {config.title}{" "}
                    {config.isDisabled && (
                      <span className="text-gray-400 text-sm">
                        (Coming Soon)
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-500">
                    {config.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
