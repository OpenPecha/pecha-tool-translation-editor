import React, { useState } from "react";
import { Settings, Languages, MessageSquare, FileText } from "lucide-react";
import SelectTranslation from "./SelectTranslation";
import { Button } from "@/components/ui/button";
import { IoIosArrowForward } from "react-icons/io";
import Comments from "./Comments";
import SettingsPanel from "./Settings";
import FootnoteView from "../Footnote/FootnoteView";

type MenuOption =
  | "translations"
  | "settings"
  | "main"
  | "comments"
  | "commentary"
  | "footnotes";

function SideMenu({
  setSelectedTranslationId,
  documentId,
  isEditable = true,
}: {
  readonly setSelectedTranslationId: (id: string) => void;
  readonly documentId: string;
  readonly isEditable?: boolean;
}) {
  const [currentView, setCurrentView] = useState<MenuOption>("main");
  const reset = () => {
    setCurrentView("main");
  };

  const renderContent = () => {
    switch (currentView) {
      case "translations":
        return (
          <InMenuWrapper onBackClick={reset}>
            <SelectTranslation
              setSelectedTranslationId={setSelectedTranslationId}
            />
          </InMenuWrapper>
        );
      case "settings":
        return (
          <InMenuWrapper onBackClick={reset}>
            <SettingsPanel />
          </InMenuWrapper>
        );
      case "comments":
        return (
          <InMenuWrapper onBackClick={reset}>
            <Comments />
          </InMenuWrapper>
        );
      case "footnotes":
        return (
          <InMenuWrapper onBackClick={reset}>
            <FootnoteView documentId={documentId} isEditable={isEditable} />
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
              onClick={() => setCurrentView("comments")}
              title="comments"
            >
              <MessageSquare size={16} />
            </MenuButton>

            <MenuButton
              onClick={() => setCurrentView("footnotes")}
              title="footnotes"
            >
              <FileText size={16} />
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
      style={{
        width: currentView === "main" ? "" : "calc(var(--spacing) * 84)",
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
      variant="outline"
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
    <div className="h-full flex group relative  w-full">
      {/* Line container */}
      <div className="relative h-full">
        {/* Vertical Line (hidden by default, shows on hover) */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-gray-300 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Arrow (hidden by default, shows on hover) */}
        <div
          className="absolute bg-white border rounded-full p-2 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer text-gray-700 text-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          onClick={onBackClick}
        >
          <IoIosArrowForward />
        </div>
      </div>

      {/* Content area */}
      <div className="p-4 w-full">{children}</div>
    </div>
  );
}

export default SideMenu;
