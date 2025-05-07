import React, { useState } from "react";
import {
  ChevronLeft,
  Settings,
  MessageSquare,
  BookOpen,
  Languages,
} from "lucide-react";
import SelectTranslation from "./SelectTranslation";
import Comments from "./Comments";
import { Button } from "@/components/ui/button";

type MenuOption =
  | "translations"
  | "settings"
  | "main"
  | "comments"
  | "commentary";

function SideMenu({
  setSelectedTranslationId,
}: {
  readonly setSelectedTranslationId: (id: string) => void;
}) {
  const [currentView, setCurrentView] = useState<MenuOption>("main");
  const renderContent = () => {
    switch (currentView) {
      case "translations":
        return (
          <InMenuWrapper onBackClick={() => setCurrentView("main")}>
            <SelectTranslation
              setSelectedTranslationId={setSelectedTranslationId}
            />
          </InMenuWrapper>
        );
      case "settings":
        return (
          <InMenuWrapper onBackClick={() => setCurrentView("main")}>
            <div>Settings Content</div>
          </InMenuWrapper>
        );
      case "commentary":
        return (
          <InMenuWrapper onBackClick={() => setCurrentView("main")}>
            <div>Commentary Content</div>
          </InMenuWrapper>
        );

      default:
        return (
          <div className="flex flex-col p-4 gap-3 ">
            <MenuButton
              onClick={() => setCurrentView("translations")}
              title="translations"
            >
              <Languages size={16} />
            </MenuButton>
            <MenuButton
              onClick={() => setCurrentView("commentary")}
              title={"commentary"}
            >
              <BookOpen size={16} />
            </MenuButton>
            <MenuButton
              onClick={() => setCurrentView("settings")}
              title={"settings"}
            >
              <Settings size={16} />
            </MenuButton>
          </div>
        );
    }
  };

  return (
    <div
      className="bg-white border-l  h-full shadow-sm mt-10"
      style={{
        width: currentView === "main" ? "" : "calc(var(--spacing) * 64)",
      }}
    >
      {renderContent()}
    </div>
  );
}

function MenuButton({
  children,
  onClick,
  title,
}: {
  readonly children: React.ReactNode;
  readonly onClick: () => void;
  readonly title: string;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="ghost"
      title={title}
      className="text-left py-2 px-4 rounded-lg cursor-pointer font-medium text-gray-700 transition-colors flex items-center justify-between"
    >
      {children}
    </Button>
  );
}

function InMenuWrapper({
  children,
  onBackClick,
}: {
  readonly children: React.ReactNode;
  readonly onBackClick: () => void;
}) {
  return (
    <div className="h-full">
      <Button
        variant="ghost"
        onClick={onBackClick}
        className="flex items-center gap-2  hover:bg-gray-100 rounded-md mx-1 my-2 cursor-pointer"
      >
        <ChevronLeft size={16} />
        Back
      </Button>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default SideMenu;
