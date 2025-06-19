import { createFootnote } from "@/api/footnote";
import { useAuth } from "@/auth/use-auth-hook";
import { useEditor } from "@/contexts/EditorContext";
import { useRef, useState, useEffect, FormEvent } from "react";
import { Button } from "../ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AvatarWrapper from "../ui/custom-avatar";
import ContentEditableDiv from "../ui/contentEditable";

interface StyleProps {
  right: number;
  top: number;
  boxShadow: string;
  zIndex: number;
  maxWidth: string;
  minWidth: string;
  maxHeight: string;
  overflowY: "auto" | "hidden" | "scroll" | "visible";
}

interface QuillRange {
  index: number;
  length: number;
  top?: number;
}

function FootnoteInitialize({
  documentId,
  setShowFootnoteModal,
  currentRange,
}: {
  readonly documentId: string;
  readonly setShowFootnoteModal: (show: boolean) => void;
  readonly currentRange: QuillRange | null;
}) {
  const [isDisabled, setIsDisabled] = useState(true);
  const footnoteInputRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const { getQuill } = useEditor();
  const quill = getQuill(documentId);
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const currentRangeText = quill?.getText(
    currentRange?.index ?? 0,
    currentRange?.length ?? 0
  );
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setShowFootnoteModal(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowFootnoteModal]);

  const footnoteMutation = useMutation({
    mutationFn: (data: {
      content: string;
      threadId: string;
      start: number;
      end: number;
    }) =>
      createFootnote(
        documentId,
        currentUser?.id ?? "",
        data.content,
        data.start,
        data.end,
        data.threadId,
        currentRangeText ?? ""
      ),
    onSuccess: (createdFootnote) => {
      if (createdFootnote?.id && currentRange) {
        // Update the Quill editor to highlight the text
        quill?.formatText(
          currentRange.index,
          currentRange.length,
          "footnote",
          {
            id: createdFootnote.threadId,
            order: createdFootnote.order,
          },
          "user"
        );

        setShowFootnoteModal(false);

        // Invalidate and refetch footnotes
        queryClient.invalidateQueries({
          queryKey: ["footnotes-" + documentId],
        });
      }
    },
    onError: (error) => {
      console.error("Error adding footnote:", error);
    },
  });

  function addFootnote() {
    const content = footnoteInputRef.current?.textContent ?? "";

    if (!currentRange) return;
    if (!content || content === "" || !currentUser) {
      setShowFootnoteModal(false);
      return;
    }

    const end = currentRange.index + currentRange.length;
    const threadId = crypto.randomUUID();

    footnoteMutation.mutate({
      content,
      threadId,
      start: currentRange.index,
      end,
    });
  }

  const style: StyleProps = {
    right: 0,
    top: (currentRange?.top ?? 0) - 80,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    zIndex: 1000,
    maxWidth: "320px",
    minWidth: "280px",
    maxHeight: "250px",
    overflowY: "auto",
  };

  return (
    <div
      ref={modalRef}
      className="absolute bg-[#fff] border border-[#e5e7eb] flex-col p-2 rounded-lg"
      style={style}
    >
      <div className="flex items-center mb-4 gap-2">
        <AvatarWrapper
          imageUrl={currentUser?.picture}
          name={currentUser?.name}
          size={32}
        />
        <div>{currentUser?.name}</div>
      </div>

      <ContentEditableDiv
        ref={footnoteInputRef}
        className="w-full border rounded-[18px] scroll-auto px-2 py-1 mb-4 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-500"
        onChange={(e: FormEvent<HTMLDivElement>) => {
          const target = e.target as HTMLDivElement;
          setIsDisabled(target.textContent === "");
        }}
        autoFocus
        placeholder="Add a footnote..."
      />

      {!isDisabled && (
        <div className="flex justify-end">
          <Button
            disabled={isDisabled || footnoteMutation.isPending}
            onClick={addFootnote}
            className="px-4 py-2 rounded-full cursor-pointer bg-blue-500 text-white hover:bg-blue-600"
          >
            {footnoteMutation.isPending ? "Saving..." : "Add Footnote"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default FootnoteInitialize;
