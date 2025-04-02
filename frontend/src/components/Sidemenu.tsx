import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import SelectTranslation from "./SelectTranslation";

type MenuOption = "translations" | "settings" | "main";

function SideMenu({
  translations,
  selectedTranslationId,
  setSelectedTranslationId,
}: {
  readonly translations: any;
  readonly selectedTranslationId: any;
  readonly setSelectedTranslationId: (id: string) => void;
}) {
  const [currentView, setCurrentView] = useState<MenuOption>("main");

  const renderContent = () => {
    switch (currentView) {
      case "translations":
        return (
          <div className="h-full">
            <button
              onClick={() => setCurrentView("main")}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md mb-4"
            >
              <ChevronLeft size={16} />
              Back
            </button>
            <SelectTranslation
              translations={translations}
              setSelectedTranslationId={setSelectedTranslationId}
            />
          </div>
        );
      case "settings":
        return (
          <div className="h-full">
            <button
              onClick={() => setCurrentView("main")}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md mb-4"
            >
              <ChevronLeft size={16} />
              Back
            </button>
            <div>Settings Content</div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col p-4 gap-3">
            <button
              onClick={() => setCurrentView("translations")}
              className="w-full text-left py-2 px-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer font-medium text-gray-700 transition-colors border border-gray-200 shadow-sm flex items-center justify-between"
            >
              Translations
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
            <button
              onClick={() => setCurrentView("settings")}
              className="w-full text-left py-2 px-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer font-medium text-gray-700 transition-colors border border-gray-200 shadow-sm flex items-center justify-between"
            >
              Settings
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          </div>
        );
    }
  };

  return (
    <div className="bg-white border-l h-full w-1/4 shadow-sm">
      {renderContent()}
    </div>
  );
}

export default SideMenu;
