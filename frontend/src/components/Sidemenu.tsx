import React, { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import SelectTranslation from "./SelectTranslation";
import { useParams } from "react-router-dom";
import { fetchComments } from "@/api/comment";

type MenuOption = "translations" | "settings" | "main" | "comments";

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
              Translations
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
            <button
              onClick={() => setCurrentView("comments")}
              className="w-full text-left py-2 px-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer font-medium text-gray-700 transition-colors border border-gray-200 shadow-sm flex items-center justify-between"
            >
              Comments
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

function Comments() {
  const { id } = useParams();
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchComments(id)
        .then((data) => setComments(data || []))
        .catch((e) => console.error(e));
    }
  }, [id]);

  return (
    <div className="px-4 max-h-[calc(100vh-100px)] overflow-y-auto">
      <div className="flow-root">
        <ul role="list" className="-mb-8">
          {comments.map((comment, commentIdx) => (
            <li key={comment.id}>
              <div className="relative pb-8">
                {commentIdx !== comments.length - 1 ? (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                      <span className="text-sm font-medium text-white">
                        {comment.user.username[0].toUpperCase()}
                      </span>
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        <span className="font-medium text-gray-900">
                          {comment.user.username}
                        </span>
                        {comment.is_suggestion ? (
                          <span> suggested "{comment.suggested_text}"</span>
                        ) : (
                          <span> commented</span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {comment.content}
                      </p>
                    </div>
                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                      <time dateTime={comment.createdAt}>
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default SideMenu;
