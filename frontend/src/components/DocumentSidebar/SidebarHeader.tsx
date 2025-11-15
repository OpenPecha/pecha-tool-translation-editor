import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SidebarTab } from "./types";

interface SidebarHeaderProps {
  tabs: SidebarTab[];
  activeTab: string | null;
  onTabClick: (tabId: string) => void;
  onClose: () => void;
  isTranslationEditor: boolean;
  sidebarView: "list" | "thread" | "new";
  onBack: () => void;
}

const SidebarHeader = ({
  tabs,
  activeTab,
  onTabClick,
  onClose,
  isTranslationEditor,
  sidebarView,
  onBack,
}: SidebarHeaderProps) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-2 border-b bg-gray-50/50 dark:bg-gray-800/50",
        isTranslationEditor && "flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          isTranslationEditor && "flex-1 flex-row-reverse"
        )}
      >
        {activeTab === "comments" && (sidebarView === "thread" || sidebarView === "new") ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Back to threads"
            >
              {isTranslationEditor ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            </Button>
            <h3 className="font-medium text-sm text-gray-800 dark:text-gray-200">
              Thread
            </h3>
          </>
        ) : (
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <Button
                  key={tab.id}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onTabClick(tab.id)}
                  className={cn(
                    "h-6 w-8 p-0 flex items-center justify-center",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                  title={tab.label}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
        title="Close sidebar"
      >
        {isTranslationEditor ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};

export default SidebarHeader;
