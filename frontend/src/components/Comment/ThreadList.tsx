import { useCommentStore } from "@/stores/commentStore";
import SkeletonLoader from "@/components/SkeletonLoader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
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
import { Trash2 } from "lucide-react";

const ThreadList = ({
  documentId,
  isOpen
}: {
  documentId: string;
  isOpen: boolean;
}) => {
  const { setSidebarView, setActiveThreadId } = useCommentStore();
  const deleteThreadMutation = useDeleteThread();
  const [threadPendingDelete, setThreadPendingDelete] = useState<Thread | null>(null);
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
  } = useFetchThreads({
    documentId,
    startOffset: debouncedSelection?.range.index,
    endOffset: debouncedSelection?.range.index + debouncedSelection?.range.length,
  });

  console.log("threadsInSelection :::",threadsInSelection);
  const {
    data: relatedSegments = [],
    isLoading: relatedSegmentsLoading,
    error: relatedSegmentsError,
  } = useFetchSegments({
    instanceId: currentDoc?.instanceId ?? "",
    startOffset: debouncedSelection?.range.index,
    endOffset: debouncedSelection?.range.index + debouncedSelection?.range.length,
  });

  const handleThreadClick = (threadId: string) => {
    setSidebarView(documentId, "thread");
    setActiveThreadId(documentId, threadId);
    const editor = quill?.root;
    const targetElement = editor?.querySelector(`[data-thread-id="${threadId}"]`);
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
      }
    });
  };

  const handleSuggestionClick = (segment: SegmentWithContent) => {
    // createThreadMutation.mutate({
    //   documentId,
    //   initialStartOffset: segment.initialStartOffset,
    //   initialEndOffset: segment.initialEndOffset,
    //   selectedText: segment.selectedText
    // })
    openSidebar(documentId, "thread", segment.segment_id);
  };

  if (threadsLoading) {
    return (
      <div className="p-4 space-y-4">
        <SkeletonLoader className="h-16 w-full" />
        <SkeletonLoader className="h-16 w-full" />
        <SkeletonLoader className="h-16 w-full" />
      </div>
    );
  }

  if (threadsError) {
    return <div className="p-4 text-red-500">{threadsError.message}</div>;
  }

  if (threadsInSelection.length === 0 && relatedSegments.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No comments or suggestions in this selection.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-y-1 p-2 pb-10">
        {threadsInSelection.map((thread) => (
          <div key={thread.id} className="relative group">
            <Button
              key={thread.id}
              variant="ghost"
              data-thread-id={thread.id}
              className="cursor-pointer w-full flex items-center justify-between border border-neutral-200 rounded-lg p-2"
              onClick={() => handleThreadClick(thread.id)}
            >
              <p className="truncate mr-3">{thread.selectedText}</p>
              {/* <span className="flex-shrink-0 rounded-full px-2 py-1 text-xs text-gray-800">
                {thread.comments?.length || 0}
              </span> */}
              <div
                className="cursor-pointer rounded-md p-1 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
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

        {threadsInSelection.length > 0 && relatedSegments.length > 0 && (
          <hr className="my-2" />
        )}

        {relatedSegments.map((segment) => (
          <div key={segment.segment_id} className="relative group">
            <Button
              variant="ghost"
              className="cursor-pointer w-full flex items-center justify-between border border-dashed border-neutral-300 rounded-lg p-2"
              onClick={() => handleSuggestionClick(segment)}
            >
              <p className="truncate mr-3">{segment.selectedText}</p>
            </Button>
          </div>
        ))}
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
