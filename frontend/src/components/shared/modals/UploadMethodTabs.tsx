import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTranslate } from "@tolgee/react";

export type UploadMethod = "empty" | "file" | "openpecha" | "ai";

interface UploadMethodTabsProps {
  activeMethod: UploadMethod;
  onMethodChange: (method: UploadMethod) => void;
  children: React.ReactNode;
  availableMethods?: UploadMethod[];
  className?: string;
}

interface TabConfig {
  value: UploadMethod;
  label: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

export function UploadMethodTabs({
  activeMethod,
  onMethodChange,
  children,
  availableMethods = ["empty", "file", "openpecha", "ai"],
  className,
}: UploadMethodTabsProps) {
  const { t } = useTranslate();

  const tabConfigs: Record<UploadMethod, TabConfig> = {
    empty: {
      value: "empty",
      label: "Empty Document",
    },
    file: {
      value: "file",
      label: t("common.file"),
    },
    openpecha: {
      value: "openpecha",
      label: t("common.openpecha")
    },
    ai: {
      value: "ai",
      label: "AI Generate",
    },
  };

  const visibleTabs = availableMethods.map((method) => tabConfigs[method]);

  return (
    <Tabs
      value={activeMethod}
      onValueChange={(value) => onMethodChange(value as UploadMethod)}
      className={cn("w-full", className)}
    >
      <TabsList
        className="grid w-full bg-gray-100 rounded-lg p-1"
        style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)` }}
      >
        {visibleTabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className={cn(
              "relative rounded-md transition-all duration-200 text-sm font-medium",
              "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm",
              "data-[state=inactive]:text-gray-600 hover:text-gray-900",
              tab.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {tab.label}
            {tab.comingSoon && (
              <span className="ml-1 text-xs text-orange-500 font-normal">
                (Soon)
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="mt-6">{children}</div>
    </Tabs>
  );
}

interface TabContentWrapperProps {
  value: UploadMethod;
  children: React.ReactNode;
  className?: string;
}

export function TabContentWrapper({
  value,
  children,
  className,
}: TabContentWrapperProps) {
  return (
    <TabsContent value={value} className={cn("space-y-4", className)}>
      {children}
    </TabsContent>
  );
}
