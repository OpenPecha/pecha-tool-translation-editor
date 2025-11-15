import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SidebarTab } from "./types";

interface SidebarTabsProps {
  tabs: SidebarTab[];
  activeTab: string | null;
  onTabClick: (tabId: string) => void;
}

const SidebarTabs = ({ tabs, activeTab, onTabClick }: SidebarTabsProps) => {
  return (
    <div className="flex flex-col gap-1 p-2">
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
              "h-8 w-8 p-0 flex items-center justify-center",
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
  );
};

export default SidebarTabs;
