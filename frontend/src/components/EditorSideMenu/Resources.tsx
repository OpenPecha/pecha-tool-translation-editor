import React, { useState, useEffect } from "react";
import { Search, BookOpen, FileText, Loader2, AlertCircle } from "lucide-react";
import {
  searchSegmentInResources,
  SegmentSearchResponse,
} from "../../api/resources";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useTextSelection } from "../ChatSidebar/hooks";
import { Avatar, AvatarFallback } from "../ui/avatar";

interface CommentaryData {
  key: string;
  number: number;
  text: string;
  metadata?: {
    title?: { en?: string; bo?: string };
    author?: { en?: string; bo?: string } | string;
  };
}

const truncateText = (text: string, maxLength: number = 150) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// Generate commentaries list dynamically from match data
const generateCommentariesList = (match: {
  matchedEntry: Record<string, string>;
  metadata: Record<string, any>;
}): CommentaryData[] => {
  const commentaries: CommentaryData[] = [];

  // Find all commentary keys in matchedEntry
  for (const key of Object.keys(match.matchedEntry)) {
    if (key.startsWith("commentary_") && match.matchedEntry[key]) {
      const commentaryNumber = Number.parseInt(
        key.replace("commentary_", ""),
        10
      );
      if (!Number.isNaN(commentaryNumber)) {
        commentaries.push({
          key,
          number: commentaryNumber,
          text: match.matchedEntry[key],
          metadata: match.metadata[key],
        });
      }
    }
  }

  // Sort by commentary number
  return commentaries.sort((a, b) => a.number - b.number);
};

function Resources() {
  const { t } = useTranslation();

  const { selectedText } = useTextSelection();
  const [searchQuery, setSearchQuery] = useState(selectedText || "");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [shouldSearch, setShouldSearch] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // React Query for fetching resources
  const {
    data: searchResults,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<SegmentSearchResponse>({
    queryKey: ["resources", debouncedQuery.trim()],
    queryFn: () => searchSegmentInResources(debouncedQuery.trim()),
    enabled: shouldSearch && debouncedQuery.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime in newer versions)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      return;
    }
    setShouldSearch(true);
    if (debouncedQuery.trim() === searchQuery.trim()) {
      refetch();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term) return text;
    const regex = new RegExp(`(${term})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, partIndex) =>
      regex.test(part) ? (
        <mark
          key={`highlight-${partIndex}`}
          className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded"
        >
          {part}
        </mark>
      ) : (
        <span key={`text-${partIndex}`}>{part}</span>
      )
    );
  };

  // Auto-search when selectedText changes
  useEffect(() => {
    if (selectedText && selectedText !== searchQuery) {
      setSearchQuery(selectedText);
      // Auto-search if there's selected text
      if (selectedText.trim()) {
        setShouldSearch(true);
      }
    }
  }, [selectedText, searchQuery]);

  // Derived state from React Query
  const results = searchResults?.matches || [];
  const hasSearched = shouldSearch && (searchResults !== undefined || error);
  const loading = isLoading || isFetching;
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Error State */}
        {error && (
          <div
            className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 
                        border border-red-200 dark:border-red-800 rounded-lg mb-4"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-700 dark:text-red-300 text-sm">
                {error instanceof Error ? error.message : "Search failed"}
              </span>
            </div>
            <button
              onClick={() => refetch()}
              className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            >
              {t("resources.retry", "Retry")}
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              {t("resources.searching", "Searching...")}
            </span>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            {results.map((match) => (
              <div key={`match-${match.fileName}`}>
                {/* File Header */}
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {match.metadata?.root?.title?.en || match.fileName}
                    </p>
                    {match.metadata?.root?.author?.en && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t("resources.by", "by")}{" "}
                        {match.metadata.root.author.en}
                      </p>
                    )}
                  </div>
                </div>

                {/* Root Text */}
                <div className="mb-3">
                  <p className="text-sm font-monlam-2 text-gray-800 dark:text-gray-200 leading-relaxed">
                    {highlightSearchTerm(
                      truncateText(match.matchedEntry.root_display_text),
                      searchQuery
                    )}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <FileText className="h-3 w-3 text-gray-400" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      {t("resources.commentary", "Commentary")}{" "}
                    </span>
                  </div>
                  {/* Commentaries */}
                  <Commentaries
                    commentaries={generateCommentariesList(match)}
                    matchIndex={0}
                  />
                </div>
                {/* Sanskrit Text */}
                {match.matchedEntry.sanskrit_text && (
                  <div className="mt-3 p-3rounded-lg">
                    <div className="flex items-center gap-1 mb-2">
                      <FileText className="h-3 w-3 " />
                      <span className="text-xs font-medium  uppercase">
                        {t("resources.sanskrit", "Sanskrit")} Translation
                      </span>
                    </div>

                    {/* Sanskrit Title and Author */}
                    {match.metadata.sanskrit_text && (
                      <div className="mb-2 flex items-center gap-1">
                        {match.metadata.sanskrit_text.author && (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {match.metadata.sanskrit_text.author
                                .charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {match.metadata.sanskrit_text.title?.sa && (
                          <h5 className="text-xs font-medium ">
                            {match.metadata.sanskrit_text.title.sa}
                          </h5>
                        )}
                      </div>
                    )}

                    {/* Sanskrit Text */}
                    <CollapsableDiv>
                      {match.matchedEntry.sanskrit_text}
                    </CollapsableDiv>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!hasSearched && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t("resources.emptyTitle", "Search Linked Resources")}
            </h4>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm">
              {t(
                "resources.emptyDescription",
                "Enter a text segment to search through root texts and commentaries"
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface CommentariesProps {
  commentaries: CommentaryData[];
  matchIndex: number;
}

const Commentaries = ({ commentaries, matchIndex }: CommentariesProps) => {
  const { t } = useTranslation();

  if (commentaries.length === 0) return null;

  return (
    <div className="space-y-3">
      {commentaries.map((commentary) => {
        const commentaryTitle =
          commentary.metadata?.title?.en ||
          commentary.metadata?.title?.bo ||
          "";
        const commentaryAuthor =
          typeof commentary.metadata?.author === "string"
            ? commentary.metadata.author
            : commentary.metadata?.author?.en ||
              commentary.metadata?.author?.bo ||
              "";

        return (
          <div
            key={`commentary-${commentary.number}-${matchIndex}`}
            className="mb-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
          >
            {/* Commentary Title and Author */}
            {(commentaryTitle || commentaryAuthor) && (
              <div className="mb-2 flex items-center gap-2">
                {commentaryAuthor && (
                  <div title={commentaryAuthor} className="inline-block">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {commentaryAuthor.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <div>
                  {commentaryTitle && (
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                      {commentaryTitle}
                    </p>
                  )}
                  {commentaryAuthor && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {t("resources.by", "by")} {commentaryAuthor}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Commentary Text */}
            <CollapsableDiv>{commentary.text}</CollapsableDiv>
          </div>
        );
      })}
    </div>
  );
};

const CollapsableDiv = ({ children }: { children: React.ReactNode }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const text = typeof children === "string" ? children : String(children);
  const shouldCollapse = text.length > 150;
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 font-monlam-2">
      <div
        className={`text-sm text-gray-700 dark:text-gray-300 ${
          !isExpanded && shouldCollapse ? "line-clamp-3" : ""
        }`}
      >
        {children}
      </div>
      {shouldCollapse && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline self-start"
        >
          {isExpanded
            ? t("common.showLess", "Show less")
            : t("common.showMore", "Show more")}
        </button>
      )}
    </div>
  );
};

export default Resources;
