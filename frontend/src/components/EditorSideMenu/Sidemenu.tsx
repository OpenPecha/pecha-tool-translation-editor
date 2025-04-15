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
import DocumentInfo from "./DocumentInfo";
import { Button } from "@/components/ui/button";
import { Translation } from "../DocumentWrapper";

type MenuOption =
  | "translations"
  | "settings"
  | "main"
  | "comments"
  | "commentary";

interface DocumentInfo {
  id: string;
  identifier: string;
  isRoot: boolean;
  [key: string]: any; // For other properties
}

function SideMenu({
  translations,
  setSelectedTranslationId,
  doc_info,
}: {
  readonly translations: Translation[];
  readonly setSelectedTranslationId: (id: string) => void;
  readonly doc_info: DocumentInfo;
}) {
  const [currentView, setCurrentView] = useState<MenuOption>("main");
  const renderContent = () => {
    switch (currentView) {
      case "translations":
        return (
          <InMenuWrapper onBackClick={() => setCurrentView("main")}>
            <SelectTranslation
              translations={translations}
              setSelectedTranslationId={setSelectedTranslationId}
              doc_info={doc_info}
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
      case "comments":
        return (
          <InMenuWrapper onBackClick={() => setCurrentView("main")}>
            <Comments />
          </InMenuWrapper>
        );
      default:
        return (
          <div className="flex flex-col p-4 gap-3">
            <MenuButton onClick={() => setCurrentView("translations")}>
              <div className="flex items-center gap-2">
                <Languages size={16} />
                Translations
              </div>
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </MenuButton>
            <MenuButton onClick={() => setCurrentView("commentary")}>
              <div className="flex items-center gap-2">
                <BookOpen size={16} />
                Commentary
              </div>
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </MenuButton>
            <MenuButton onClick={() => setCurrentView("comments")}>
              <div className="flex items-center gap-2">
                <MessageSquare size={16} />
                Comments
              </div>
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </MenuButton>
            <MenuButton onClick={() => setCurrentView("settings")}>
              <div className="flex items-center gap-2">
                <Settings size={16} />
                Settings
              </div>
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </MenuButton>
          </div>
        );
    }
  };

  return (
    <div className="absolute right-0 bg-white border-l h-full w-1/4 shadow-sm">
      {renderContent()}
      <DocumentInfo doc_info={doc_info} />
    </div>
  );
}

function MenuButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="ghost"
      className="w-full text-left py-2 px-4 rounded-lg cursor-pointer font-medium text-gray-700 transition-colors flex items-center justify-between"
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
