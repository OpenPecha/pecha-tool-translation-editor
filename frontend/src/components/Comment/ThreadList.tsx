import { useCommentStore } from "@/stores/commentStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEditor } from "@/contexts/EditorContext";
import { useSelectionStore } from "@/stores/selectionStore";
import { useState } from "react";
import useDebounce from "@/hooks/useDebounce";
import { SegmentWithContent } from "@/api/openpecha";
import { Thread } from "@/api/thread";
import { useCurrentDoc } from "@/hooks/useCurrentDoc";
import { useFetchThreads } from "./hooks/useFetchThreads";
import { useFetchSegments } from "./hooks/useFetchSegments";
import { useDeleteThread } from "./hooks/useDeleteThread";
import {
  Trash2,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";

// Loading skeleton components
const ThreadLoadingSkeleton = () => (
  <div className="space-y-2 p-2">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="animate-pulse border border-neutral-200 rounded-lg p-3 space-y-2"
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-neutral-300" />
          <div className="h-4 bg-neutral-200 rounded flex-1"></div>
        </div>
        <div className="h-3 bg-neutral-100 rounded w-2/3"></div>
      </div>
    ))}
  </div>
);

const SegmentLoadingSkeleton = () => (
  <div className="space-y-2 p-2">
    {[1, 2].map((i) => (
      <div
        key={i}
        className="animate-pulse border border-dashed border-neutral-300 rounded-lg p-3 space-y-2"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-neutral-300" />
          <div className="h-4 bg-neutral-200 rounded flex-1"></div>
        </div>
        <div className="h-3 bg-neutral-100 rounded w-3/4"></div>
      </div>
    ))}
  </div>
);

// Error components
const ErrorState = ({
  message,
  onRetry,
  icon: Icon = AlertCircle,
}: {
  message: string;
  onRetry: () => void;
  icon?: React.ElementType;
}) => (
  <div className="p-4 m-2 border border-red-200 bg-red-50 rounded-lg">
    <div className="flex items-start gap-3">
      <Icon size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <p className="text-sm text-red-800">{message}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="text-red-600 border-red-300 hover:bg-red-100"
        >
          <RefreshCw size={14} className="mr-1" />
          Try Again
        </Button>
      </div>
    </div>
  </div>
);

const ThreadList = ({ documentId }: { documentId: string }) => {
  const { setSidebarView, setActiveThreadId } = useCommentStore();
  const deleteThreadMutation = useDeleteThread();
  const [threadPendingDelete, setThreadPendingDelete] = useState<Thread | null>(
    null
  );
  const isDeletingThread = deleteThreadMutation.isPending;
  const { getQuill } = useEditor();
  const quill = getQuill(documentId);
  const selection = useSelectionStore((state) => {
    return state.selections[documentId];
  });
  const { currentDoc } = useCurrentDoc(documentId);
  const debouncedSelection = useDebounce(selection, 300);
  const {
    data: threadsInSelection = [],
    isLoading: threadsLoading,
    error: threadsError,
    refetch: refetchThreads,
  } = useFetchThreads({
    documentId,
    startOffset: debouncedSelection?.range?.index,
    endOffset:
      debouncedSelection?.range?.index !== undefined &&
      debouncedSelection?.range?.length !== undefined
        ? debouncedSelection.range.index + debouncedSelection.range.length
        : undefined,
  });

  const {
    data: relatedSegments = [],
    isLoading: relatedSegmentsLoading,
    error: relatedSegmentsError,
    refetch: refetchSegments,
  } = useFetchSegments({
    textId: String(currentDoc?.metadata?.textId || ""),
    startOffset: debouncedSelection?.range?.index || undefined,
    endOffset:
      debouncedSelection?.range?.index !== undefined &&
      debouncedSelection?.range?.length !== undefined
        ? debouncedSelection.range.index + debouncedSelection.range.length
        : undefined,
  });

  const handleThreadClick = (threadId: string) => {
    setSidebarView(documentId, "thread");
    setActiveThreadId(documentId, threadId);
    const editor = quill?.root;
    const targetElement = editor?.querySelector(
      `[data-thread-id="${threadId}"]`
    );
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        targetElement.classList.add("animate-pulse");
        setTimeout(() => {
          targetElement.classList.remove("animate-pulse");
        }, 3000);
      }, 100);
    }
  };

  const handleConfirmDelete = () => {
    if (!threadPendingDelete || isDeletingThread) {
      return;
    }

    deleteThreadMutation.mutate(threadPendingDelete, {
      onSuccess: () => {
        setThreadPendingDelete(null);
      },
    });
  };

  const handleSuggestionClick = (segment: SegmentWithContent) => {
    console.info("segment in ThreadList.tsx ::", segment);
  };

  const hasNoData =
    threadsInSelection.length === 0 && relatedSegments.length === 0;
  const isLoading = threadsLoading || relatedSegmentsLoading;
  const hasError = threadsError || relatedSegmentsError;

  // Show empty state only when not loading and no errors
  if (hasNoData && !isLoading && !hasError) {
    return (
      <div className="p-6 text-center space-y-3">
        <div className="flex justify-center">
          <div className="rounded-full bg-neutral-100 p-3">
            <MessageSquare size={24} className="text-neutral-400" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-700">
            No comments or suggestions
          </p>
          <p className="text-xs text-neutral-500">
            Select text to see related comments and suggestions
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-y-1 p-2 pb-10">
        {/* Threads Section */}
        {threadsLoading ? (
          <ThreadLoadingSkeleton />
        ) : threadsError ? (
          <ErrorState
            message="Failed to load comments. Please try again."
            onRetry={() => refetchThreads()}
            icon={MessageSquare}
          />
        ) : threadsInSelection.length > 0 ? (
          <>
            <div className="px-2 py-1 text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Comments ({threadsInSelection.length})
            </div>
            {threadsInSelection.map((thread: Thread) => (
              <div key={thread.id} className="relative group">
                <Button
                  variant="ghost"
                  data-thread-id={thread.id}
                  className="cursor-pointer w-full flex items-center justify-between border border-neutral-200 rounded-lg p-2 hover:border-neutral-300 hover:bg-neutral-50 transition-all"
                  onClick={() => handleThreadClick(thread.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MessageSquare
                      size={16}
                      className="text-neutral-400 flex-shrink-0"
                    />
                    <p className="truncate text-left">{thread.selectedText}</p>
                  </div>
                  <div
                    className="cursor-pointer rounded-md p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-red-500 flex-shrink-0 ml-2"
                    role="button"
                    aria-label="Delete thread"
                    onClick={(event) => {
                      event.stopPropagation();
                      setThreadPendingDelete(thread);
                    }}
                  >
                    <Trash2 size={16} />
                  </div>
                </Button>
              </div>
            ))}
          </>
        ) : (
          <div className="p-4 text-center text-gray-500">
            <p>No comments for this selection.</p>
          </div>
        )}

        {/* Divider between threads and segments */}
        {threadsInSelection.length > 0 &&
          (relatedSegmentsLoading || relatedSegments.length > 0) && (
            <hr className="my-3 border-neutral-200" />
          )}

        {/* Segments Section */}
        {relatedSegmentsLoading ? (
          <SegmentLoadingSkeleton />
        ) : relatedSegmentsError ? (
          <ErrorState
            message="Failed to load suggestions. Please try again."
            onRetry={() => refetchSegments()}
            icon={Sparkles}
          />
        ) : relatedSegments.length > 0 ? (
          <>
            <div className="px-2 py-1 text-xs font-medium text-neutral-500 uppercase tracking-wide flex items-center gap-1">
              <Sparkles size={12} />
              Suggestions ({relatedSegments.length})
            </div>
            {relatedSegments.map((segment) => (
              <div key={segment.segment_id} className="relative group">
                <Button
                  variant="ghost"
                  className="cursor-pointer w-full flex items-center gap-2 border border-dashed border-neutral-300 rounded-lg p-2 hover:border-neutral-400 hover:bg-neutral-50 transition-all"
                  onClick={() => handleSuggestionClick(segment)}
                >
                  <Sparkles
                    size={16}
                    className="text-amber-500 flex-shrink-0"
                  />
                  <p className="truncate text-left flex-1">{segment.content}</p>
                </Button>
              </div>
            ))}
          </>
        ) : (
          <div className="p-4 text-center text-gray-500">
            <p>No suggestions in this selection.</p>
          </div>
        )}
      </div>

      <Dialog
        open={!!threadPendingDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isDeletingThread) {
            setThreadPendingDelete(null);
          }
        }}
      >
        <DialogContent className="max-w-sm space-y-5">
          <DialogHeader className="space-y-2">
            <DialogTitle>Delete thread?</DialogTitle>
            <DialogDescription>
              This conversation and its replies will be removed permanently.
            </DialogDescription>
          </DialogHeader>

          {threadPendingDelete?.selectedText ? (
            <div className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
              {threadPendingDelete.selectedText}
            </div>
          ) : null}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              className="w-full cursor-pointer sm:w-auto"
              onClick={() => setThreadPendingDelete(null)}
              disabled={isDeletingThread}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-full cursor-pointer sm:w-auto"
              onClick={handleConfirmDelete}
              disabled={isDeletingThread}
            >
              {isDeletingThread ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ThreadList;
