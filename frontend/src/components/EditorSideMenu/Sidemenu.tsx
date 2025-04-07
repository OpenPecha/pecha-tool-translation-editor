import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  Settings,
  MessageSquare,
  BookOpen,
  Languages,
} from "lucide-react";
import SelectTranslation from "./SelectTranslation";
import { useParams } from "react-router-dom";
import { deleteComment, fetchComments } from "@/api/comment";
import { useEditor } from "@/contexts/EditorContext";
import { BiTrash } from "react-icons/bi";
import Comments from "./Comments";

type MenuOption =
  | "translations"
  | "settings"
  | "main"
  | "comments"
  | "commentary";

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
      case "commentary":
        return (
          <div className="h-full">
            <button
              onClick={() => setCurrentView("main")}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md mb-4"
            >
              <ChevronLeft size={16} />
              Back
            </button>
            <div>Commentary Content</div>
          </div>
        );
      case "comments":
        return (
          <div className="h-full">
            <button
              onClick={() => setCurrentView("main")}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md mb-4"
            >
              <ChevronLeft size={16} />
              Back
            </button>
            <Comments />
          </div>
        );
      default:
        return (
          <div className="flex flex-col p-4 gap-3">
            <button
              onClick={() => setCurrentView("translations")}
              className="w-full text-left py-2 px-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer font-medium text-gray-700 transition-colors border border-gray-200 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Languages size={16} />
                Translations
              </div>
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
            <button
              onClick={() => setCurrentView("commentary")}
              className="w-full text-left py-2 px-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer font-medium text-gray-700 transition-colors border border-gray-200 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <BookOpen size={16} />
                Commentary
              </div>
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
            <button
              onClick={() => setCurrentView("comments")}
              className="w-full text-left py-2 px-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer font-medium text-gray-700 transition-colors border border-gray-200 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={16} />
                Comments
              </div>
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
            <button
              onClick={() => setCurrentView("settings")}
              className="w-full text-left py-2 px-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer font-medium text-gray-700 transition-colors border border-gray-200 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Settings size={16} />
                Settings
              </div>
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          </div>
        );
    }
  };

  return (
    <div className="absolute right-0 bg-white border-l h-full w-1/4 shadow-sm">
      {renderContent()}
    </div>
  );
}

export default SideMenu;
