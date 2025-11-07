import React, { useState } from "react";
import { Languages, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IoIosArrowForward } from "react-icons/io";
import { ScrollArea } from "@/components/ui/scroll-area";
import AvatarWrapper from "@/components/ui/custom-avatar";
import { groupBy } from "lodash";
import { GrDocument } from "react-icons/gr";
import { Badge } from "@/components/ui/badge";
import formatTimeAgo from "@/lib/formatTimeAgo";
import { Translation } from "@/hooks/useCurrentDoc";
import {
  useFetchDocumentComments,
  useFetchDocumentFootnotes,
  useFetchPublicDocumentTranslations,
} from "@/api/queries/documents";

type MenuOption = "main" | "translations" | "comments" | "footnotes";

interface PublicSideMenuProps {
  documentId: string;
  onSelectTranslation?: (translationId: string) => void;
}

function PublicSideMenu({
  documentId,
  onSelectTranslation,
}: PublicSideMenuProps) {
  const [currentView, setCurrentView] = useState<MenuOption>("main");

  const reset = () => {
    setCurrentView("main");
  };

  const renderContent = () => {
    switch (currentView) {
      case "translations":
        return (
          <InMenuWrapper onBackClick={reset}>
            <PublicTranslations
              documentId={documentId}
              onSelectTranslation={onSelectTranslation}
            />
          </InMenuWrapper>
        );
      case "comments":
        return (
          <InMenuWrapper onBackClick={reset}>
            <PublicComments documentId={documentId} />
          </InMenuWrapper>
        );
      case "footnotes":
        return (
          <InMenuWrapper onBackClick={reset}>
            <PublicFootnotes documentId={documentId} />
          </InMenuWrapper>
        );
      default:
        return (
          <div className="flex flex-col p-4 gap-3">
            <MenuButton
              onClick={() => setCurrentView("translations")}
              title="View Translations"
            >
              <Languages size={16} />
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

// Read-only Translations Component
function PublicTranslations({
  documentId,
  onSelectTranslation,
}: {
  documentId: string;
  onSelectTranslation?: (translationId: string) => void;
}) {
  const {
    data: translations = [] as Translation[],
    isLoading,
    error,
  } = useFetchPublicDocumentTranslations(documentId);

  if (isLoading) return <Message text="Loading translations..." />;
  if (error) return <Message text="Error loading translations" error />;
  if (!translations.length) return <Message text="No translations available" />;

  return (
    <div className="rounded-lg overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium font-google-sans text-gray-700">
          Translations
        </h3>
        <Badge variant="secondary" className="text-xs">
          <Eye className="h-3 w-3 mr-1" />
          Read-only
        </Badge>
      </div>

      <div className="flex flex-col gap-2 p-2">
        {translations.map((translation: Translation) => (
          <PublicTranslationItem
            key={translation.id}
            translation={translation}
            onSelectTranslation={onSelectTranslation}
          />
        ))}
      </div>
    </div>
  );
}

// Read-only Translation Item Component
function PublicTranslationItem({
  translation,
  onSelectTranslation,
}: {
  translation: Translation;
  onSelectTranslation?: (translationId: string) => void;
}) {
  const isDisabled = false;

  return (
    <div className="flex items-center w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!isDisabled && onSelectTranslation) {
            onSelectTranslation(translation.id);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isDisabled && onSelectTranslation) {
            onSelectTranslation(translation.id);
          }
        }}
        className={`flex flex-1 items-center gap-2 p-2 rounded-md w-full text-left flex-grow ${
          isDisabled
            ? "opacity-70 cursor-not-allowed bg-gray-50"
            : "cursor-pointer hover:bg-gray-100"
        }`}
        aria-label={`View translation ${translation.id}`}
        aria-disabled={isDisabled}
      >
        <div className="relative flex items-center">
          <GrDocument size={24} color={"#d1d5db"} className="flex-shrink-0" />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700 capitalize">
            {translation.language}
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 truncate">
            {translation.name}
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>{formatTimeAgo(translation.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Read-only Comments Component
function PublicComments({ documentId }: { documentId: string }) {
  const {
    data: commentsThread = [],
    isLoading,
    error,
  } = useFetchDocumentComments(documentId);

  if (isLoading) return <Message text="Loading comments..." />;
  if (error) return <Message text="Error loading comments" error />;
  if (!commentsThread.length) return <Message text="No comments yet" />;

  const groupedThreads = groupBy(
    commentsThread,
    (comment) => comment.threadId || comment.id
  );

  return (
    <div className="rounded-lg overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium font-google-sans text-gray-700">Comments</h3>
        <Badge variant="secondary" className="text-xs">
          <Eye className="h-3 w-3 mr-1" />
          Read-only
        </Badge>
      </div>

      <ScrollArea className="px-4 h-[calc(100vh-200px)] overflow-y-auto">
        <div className="flow-root -mb-8">
          {Object.entries(groupedThreads).map(([threadId, threadComments]) => {
            if (!threadComments || threadComments.length === 0) return null;

            const firstComment = threadComments[0];
            const userName = firstComment?.user?.username || "Unknown User";
            const userPicture = firstComment?.user?.picture || "";

            return (
              <div key={threadId} className="border-b mb-4">
                <div className="p-2 mb-2 rounded bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AvatarWrapper
                        imageUrl={userPicture}
                        name={userName}
                        size={24}
                      />
                      <p className="text-sm font-medium">{userName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {firstComment?.createdAt
                        ? new Date(firstComment.createdAt).toLocaleDateString()
                        : "Unknown date"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {firstComment?.is_suggestion ? "Suggestion" : "Comment"} on:
                    "{firstComment?.comment_on || "Unknown text"}"
                  </p>
                </div>

                <div className="pl-4 space-y-2">
                  {threadComments.map((comment) => (
                    <PublicCommentCard key={comment.id} comment={comment} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// Read-only Footnotes Component
function PublicFootnotes({ documentId }: { documentId: string }) {
  const {
    data: footnotesData,
    isLoading,
    error,
  } = useFetchDocumentFootnotes(documentId);

  const handleFootnoteClick = (footnote: any) => {
    // Find the footnote span in the editor and highlight it
    const footnoteSpan = document.querySelector(
      `span.footnote[data-id="${footnote.threadId}"]`
    ) as HTMLElement;

    if (footnoteSpan) {
      // Scroll the footnote span into view
      footnoteSpan.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      // Add temporary highlight effect
      const originalBackground = footnoteSpan.style.backgroundColor;
      footnoteSpan.style.backgroundColor = "rgba(59, 130, 246, 0.3)";
      footnoteSpan.style.transition = "background-color 0.3s ease";

      // Remove highlight after 2 seconds
      setTimeout(() => {
        footnoteSpan.style.backgroundColor = originalBackground;
      }, 2000);
    }
  };

  // Sort footnotes by their position in the document
  const getSortedFootnotes = () => {
    const footnotes = footnotesData || [];

    // Get all footnote spans in the editor
    const footnoteSpans = document.querySelectorAll("span.footnote[data-id]");
    const activeThreadIds = new Set<string>();
    const footnotePositions = new Map<string, number>();

    // Collect all active thread IDs and their positions from the editor
    footnoteSpans.forEach((span, index) => {
      const threadId = span.getAttribute("data-id");
      if (threadId) {
        activeThreadIds.add(threadId);
        footnotePositions.set(threadId, index);
      }
    });

    // Filter footnotes to only include those that are currently in the editor
    const activeFootnotes = footnotes.filter((footnote: any) =>
      activeThreadIds.has(footnote.threadId)
    );

    // Sort footnotes by their position in the document
    return activeFootnotes.sort((a: any, b: any) => {
      const posA = footnotePositions.get(a.threadId) ?? 0;
      const posB = footnotePositions.get(b.threadId) ?? 0;
      return posA - posB;
    });
  };

  if (isLoading) return <Message text="Loading footnotes..." />;
  if (error) return <Message text="Error loading footnotes" error />;

  const sortedFootnotes = getSortedFootnotes();
  if (!sortedFootnotes.length) return <Message text="No footnotes yet" />;

  return (
    <div className="rounded-lg overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium font-google-sans text-gray-700">
          Footnotes
        </h3>
        <Badge variant="secondary" className="text-xs">
          <Eye className="h-3 w-3 mr-1" />
          Read-only
        </Badge>
      </div>

      <ScrollArea className="px-4 h-[calc(100vh-200px)] overflow-y-auto">
        <div className="space-y-2">
          {sortedFootnotes.map((footnote, index) => (
            <div
              key={footnote.id}
              className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleFootnoteClick(footnote)}
              title="Click to highlight text in document"
            >
              <div className="flex items-start gap-2">
                <sup className="text-secondary-600 font-medium text-sm mt-1">
                  {index + 1}
                </sup>
                <div className="text-sm text-gray-800 leading-relaxed">
                  {footnote.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// Helper Components
function PublicCommentCard({ comment }: { comment: any }) {
  return (
    <div className="p-3 bg-white border rounded mb-2">
      <div className="flex items-center gap-2 mb-2">
        <AvatarWrapper
          imageUrl={comment.user?.picture || ""}
          name={comment.user?.username || "Unknown User"}
          size={20}
        />
        <span className="text-sm font-medium">
          {comment.user?.username || "Unknown User"}
        </span>
        <span className="text-xs text-gray-500">
          {new Date(comment.createdAt).toLocaleDateString()}
        </span>
      </div>

      {comment.is_suggestion && comment.suggested_text && (
        <div className="bg-yellow-50 border border-yellow-200 p-2 rounded mb-2">
          <span className="text-xs text-yellow-800 font-medium">
            Suggested:{" "}
          </span>
          <span className="text-sm">{comment.suggested_text}</span>
        </div>
      )}

      <div className="text-sm">{comment.content}</div>
    </div>
  );
}

function MenuButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
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
  children: React.ReactNode;
  onBackClick: () => void;
}) {
  return (
    <div className="h-full flex group relative w-full">
      <div className="relative h-full">
        {/* Vertical Line (hidden by default, shows on hover except on mobile) */}
        <div
          className="absolute left-1/2 top-0 h-full w-px bg-gray-300 transform -translate-x-1/2 
          opacity-100 
          sm:opacity-0 sm:group-hover:opacity-100 sm:group-hover/content:opacity-100
          transition-opacity duration-200"
        />

        {/* Arrow (always visible on mobile, only on hover on desktop) */}
        <div
          className="absolute bg-white border rounded-full p-2 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer text-gray-700 text-xl z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-hover/content:opacity-100 transition-opacity duration-200"
          onClick={onBackClick}
        >
          <IoIosArrowForward />
        </div>
      </div>

      {/* Content area */}
      <div className="group/content p-4 w-full">{children}</div>
    </div>
  );
}

function Message({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <div className="flex items-center justify-center h-32">
      <p className={`text-sm ${error ? "text-red-500" : "text-gray-500"}`}>
        {text}
      </p>
    </div>
  );
}

export default PublicSideMenu;
