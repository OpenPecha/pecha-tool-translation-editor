import { useCommentStore } from "@/stores/commentStore";
import { useEffect } from "react";
import { useFetchThreads } from "@/hooks/useComment";
import SkeletonLoader from "@/components/SkeletonLoader";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/contexts/EditorContext";

const ThreadList = ({ documentId }: { documentId: string }) => {
  const { openSidebar, setThreads } = useCommentStore();
  const { getQuill } = useEditor();
  const quill = getQuill(documentId);

  const {
    data: fetchedThreads,
    isLoading,
    error,
  } = useFetchThreads(documentId);

  useEffect(() => {
    if (fetchedThreads) {
      setThreads(documentId, fetchedThreads as any);
    }
  }, [fetchedThreads, setThreads, documentId]);

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
    return <div className="p-4 text-red-500">Error fetching comments.</div>;
  }

  const handleThreadClick = (threadId: string) => {
    const editor = quill?.root
    const targetElement = editor?.querySelector(`[data-thread-id="${threadId}"]`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        targetElement.classList.add('animate-pulse');
        setTimeout(() => {
          targetElement.classList.remove('animate-pulse');
        }, 3000);
      }, 100);
    }
    openSidebar(documentId, "thread", threadId);
  };

  return (
    <div className="flex flex-col gap-y-1 p-2 pb-10">
      {fetchedThreads?.map((thread) => (
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
    </div>
  );
};

export default ThreadList;
