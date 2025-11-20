import { useCommentStore } from "@/stores/commentStore";
import ThreadList from "./ThreadList";
import ThreadConversation from "./ThreadConversation";
import { cn } from "@/lib/utils";
import { useFetchDocument } from "@/api/queries/documents";

const CommentSidebar = ({
  documentId,
  isOpen
}: {
  documentId: string;
  isOpen: boolean;
}) => {
  const { getSidebarView } = useCommentStore();
  const sidebarView = getSidebarView(documentId);
  const { data: document } = useFetchDocument(documentId);
  const projectId = document?.rootProjectId;

  return (
    <div className={cn("w-full h-full flex flex-col overflow-y-auto")}>
      {sidebarView === "list" && (
        <ThreadList documentId={documentId} />
      )}
      {(sidebarView === "thread" || sidebarView === "new") && (
        <ThreadConversation documentId={documentId} projectId={projectId} />
      )}
    </div>
  );
};

export default CommentSidebar;
