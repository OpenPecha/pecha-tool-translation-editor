import { useCommentStore } from "@/stores/commentStore";
import { useSimpleCreateThread } from "@/hooks/useComment";
import SkeletonLoader from "@/components/SkeletonLoader";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/contexts/EditorContext";
import { useSelectionStore } from "@/stores/selectionStore";
import { useEffect, useState } from "react";
import useDebounce from "@/hooks/useDebounce";
import { fetchSegmentsWithContent, SegmentWithContent } from "@/api/openpecha";
import { Thread, fetchThreadsByDocumentId } from "@/api/thread";
import { useCurrentDoc } from "@/hooks/useCurrentDoc";

const ThreadList = ({
  documentId,
  isOpen
}: {
  documentId: string;
  isOpen: boolean;
}) => {
  const { openSidebar } = useCommentStore();
  const { getQuill } = useEditor();
  const quill = getQuill(documentId);
  const selection = useSelectionStore((state) => {
    // Prefer source selection matching documentId, otherwise translation selection
    if (state.source?.documentId === documentId) return state.source;
    if (state.translation?.documentId === documentId) return state.translation;
    return null;
  });
  const debouncedSelection = useDebounce(selection, 300);
  const { currentDoc } = useCurrentDoc(documentId);
  const createThreadMutation = useSimpleCreateThread();

  const [threadsInSelection, setThreadsInSelection] = useState<Thread[]>([]);
  const [segmentSuggestions, setSegmentSuggestions] = useState<
    SegmentWithContent[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const instanceId = currentDoc?.metadata?.instanceId;

    if (!isOpen || !debouncedSelection || !documentId) {
      setThreadsInSelection([]);
      setSegmentSuggestions([]);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { range } = debouncedSelection;
        const [threads, segments] = await Promise.all([
          fetchThreadsByDocumentId(
            documentId,
            range.index,
            range.index + range.length
          ),
          instanceId ? fetchSegmentsWithContent(
            instanceId,
              range.index,
              range.index + range.length
            ) : []
        ]);

        const existingThreadTexts = new Set(
          threads.map((t: Thread) => t.selectedText?.toLowerCase())
        );
        const uniqueSegments = segments.filter(
          (seg) => !existingThreadTexts.has(seg.selectedText.toLowerCase())
        );

        setThreadsInSelection(threads);
        setSegmentSuggestions(uniqueSegments);
      } catch (e) {
        setError("Failed to fetch data.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [debouncedSelection, isOpen, documentId, currentDoc?.metadata?.instanceId]);

  const handleThreadClick = (threadId: string) => {
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
    openSidebar(documentId, "thread", threadId);
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

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <SkeletonLoader className="h-16 w-full" />
        <SkeletonLoader className="h-16 w-full" />
        <SkeletonLoader className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (threadsInSelection.length === 0 && segmentSuggestions.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No comments or suggestions in this selection.</p>
      </div>
    );
  }

  return (
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
            <span className="flex-shrink-0 rounded-full px-2 py-1 text-xs text-gray-800">
              {thread.comments?.length || 0}
            </span>
          </Button>
        </div>
      ))}

      {threadsInSelection.length > 0 && segmentSuggestions.length > 0 && (
        <hr className="my-2" />
      )}

      {segmentSuggestions.map((segment) => (
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
  );
};

export default ThreadList;
