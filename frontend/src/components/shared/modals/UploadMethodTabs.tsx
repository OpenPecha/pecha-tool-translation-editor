import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTranslate } from "@tolgee/react";

import { File } from "lucide-react";
import { MdApi } from "react-icons/md";

export type UploadMethod = "empty" | "file" | "openpecha" | "ai";

interface UploadMethodTabsProps {
  readonly activeMethod: UploadMethod;
  readonly onMethodChange: (method: UploadMethod) => void;
  readonly children: React.ReactNode;
  readonly availableMethods?: UploadMethod[];
  readonly className?: string;
}

interface TabConfig {
  value: UploadMethod;
  label: string;
  disabled?: boolean;
  comingSoon?: boolean;
  icon?: React.ReactNode;
}

export function UploadMethodTabs({
  activeMethod,
  onMethodChange,
  children,
  availableMethods ,
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
      icon: <File size={14}/>
    },
    openpecha: {
      value: "openpecha",
      label: t("common.openpecha"),
      icon: <MdApi size={14}/>
    },
    ai: {
      value: "ai",
      label: "AI Generate",
    },
  };

  const visibleTabs = availableMethods?.map((method) => tabConfigs[method]);
  if(!visibleTabs) return null;

  return (
    <Tabs
      value={activeMethod}
      onValueChange={(value) => onMethodChange(value as UploadMethod)}
      className={cn("w-full", className)}
      defaultValue={visibleTabs[0].value}
    >
      <TabsList
        className="before:bg-border relative mb-3 h-auto w-full gap-0.5 bg-transparent p-0 before:absolute before:inset-x-0 before:bottom-0 before:h-px"
        style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)` }}
      >
        {visibleTabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className="bg-muted w-full flex gap-2 overflow-hidden rounded-b-none border-x border-t py-2 data-[state=active]:z-10 data-[state=active]:shadow-none "
       
          >
            {tab.icon}
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
  readonly value: UploadMethod;
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function TabContentWrapper({
  value,
  children,
  className,
}: TabContentWrapperProps) {
  return (
    <TabsContent value={value} className={cn("space-y-4 min-h-[300px]", className)}>
      {children}
    </TabsContent>
  );
}
