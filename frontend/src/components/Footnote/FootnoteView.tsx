import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFootnotes, deleteFootnote, updateFootnote } from "@/api/footnote";
import { FileText, Edit2, Trash2Icon } from "lucide-react";
import { Button } from "../ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { ScrollArea } from "../ui/scroll-area";
import emitter from "@/services/eventBus";
import { useEditor } from "@/contexts/EditorContext";
import Quill from "quill";
import { useTranslate } from "@tolgee/react";

interface Footnote {
  id: string;
  docId: string;
  threadId: string;
  initial_start_offset: number;
  initial_end_offset: number;
  user: {
    id: string;
    username: string;
  };
  content: string;
  order: number;
  createdAt: string;
  note_on?: string;
}

interface FootnoteEventData {
  id: string;
  order: number;
  position: {
    top: number;
    left: number;
  };
}

function FootnoteView({ documentId }: { readonly documentId: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFootnote, setEditingFootnote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const { getQuill } = useEditor();
  const quill = getQuill(documentId);
  const queryClient = useQueryClient();

  const {
    data: footnotesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [`footnotes-${documentId}`],
    queryFn: () => fetchFootnotes(documentId),
    enabled: !!documentId,
    refetchOnWindowFocus: false,
  });

  // Update footnote mutation
  const updateFootnoteMutation = useMutation({
    mutationFn: ({
      footnoteId,
      content,
    }: {
      footnoteId: string;
      content: string;
    }) => updateFootnote(footnoteId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`footnotes-${documentId}`] });
      setEditingFootnote(null);
      setEditContent("");
    },
    onError: (error) => {
      console.error("Error updating footnote:", error);
    },
  });

  // Delete footnote mutation
  const deleteFootnoteMutation = useMutation({
    mutationFn: (footnoteId: string) => deleteFootnote(footnoteId),
    onSuccess: (_, footnoteId) => {
      queryClient.invalidateQueries({ queryKey: [`footnotes-${documentId}`] });
      // Remove the footnote mark from the editor
      if (quill) {
        const footnoteSpan = quill.root.querySelector(
          `span.footnote[data-id="${footnoteId}"]`
        ) as HTMLElement;
        if (footnoteSpan) {
          const blot = Quill.find(footnoteSpan) as any;
          if (blot && blot.length) {
            // Get the index and length of the blot
            const index = quill.getIndex(blot);
            const length = blot.length();

            // Remove the footnote formatting
            quill.formatText(index, length, "footnote", false, "user");
          }
        }
      }
    },
    onError: (error) => {
      console.error("Error deleting footnote:", error);
    },
  });

  const handleRefresh = () => {
    refetch();
  };

  const handleEdit = (footnote: Footnote) => {
    setEditingFootnote(footnote.id);
    setEditContent(footnote.content);
  };

  const handleSaveEdit = async (footnoteId: string) => {
    try {
      await updateFootnoteMutation.mutateAsync({
        footnoteId,
        content: editContent,
      });
    } catch (error) {
      console.error("Error updating footnote:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingFootnote(null);
    setEditContent("");
  };

  const handleDelete = async (footnote: Footnote) => {
    if (window.confirm("Are you sure you want to delete this footnote?")) {
      try {
        await deleteFootnoteMutation.mutateAsync(footnote.threadId);
      } catch (error) {
        console.error("Error deleting footnote:", error);
      }
    }
  };

  const footnotes: Footnote[] = footnotesData || [];

  // Get active footnotes from the editor content
  const getActiveFootnotes = (): Footnote[] => {
    if (!quill) return footnotes;

    // Get all footnote spans in the editor
    const footnoteSpans = quill.root.querySelectorAll("span.footnote[data-id]");
    const activeThreadIds = new Set<string>();
    const footnotePositions = new Map<string, number>();

    // Collect all active thread IDs and their positions from the editor
    footnoteSpans.forEach((span, index) => {
      const threadId = span.getAttribute("data-id");
      if (threadId) {
        activeThreadIds.add(threadId);
        // Store the position (index) of each footnote in the document
        footnotePositions.set(threadId, index);
      }
    });

    // Filter footnotes to only include those that are currently in the editor
    const activeFootnotes = footnotes.filter((footnote) =>
      activeThreadIds.has(footnote.threadId)
    );

    // Sort footnotes by their position in the document
    const sortedFootnotes = activeFootnotes.sort((a, b) => {
      const posA = footnotePositions.get(a.threadId) ?? 0;
      const posB = footnotePositions.get(b.threadId) ?? 0;
      return posA - posB;
    });

    // Update counter values on footnote elements
    let currentCounter = 1;
    let lastOrder: string | null = null;

    footnoteSpans.forEach((span) => {
      const order = span.getAttribute("data-order");
      if (order !== lastOrder) {
        span.setAttribute("data-counter", currentCounter.toString());
        currentCounter++;
        lastOrder = order;
      } else {
        // Same order as previous, don't show counter
        span.setAttribute("data-counter", "");
      }
    });

    return sortedFootnotes;
  };

  // Get active footnotes (already sorted by position)
  const sortedFootnotes = getActiveFootnotes();

  const handleFootnoteClick = (footnote: Footnote) => {
    // Find the footnote span in the editor and scroll to it
    if (quill) {
      const footnoteSpan = quill.root.querySelector(
        `span.footnote[data-id="${footnote.threadId}"]`
      ) as HTMLElement;
      if (footnoteSpan) {
        // Scroll the footnote span into view
        footnoteSpan.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
        const blot = Quill.find(footnoteSpan) as any;
        if (blot && blot.length) {
          // Get the index and length of the blot
          const index = quill.getIndex(blot);
          const length = blot.length();

          // Remove the footnote formatting
          quill.formatText(
            index,
            length,
            "background",
            "rgba(59, 130, 246, 0.2)",
            "api"
          );

          setTimeout(() => {
            quill.formatText(index, length, "background", "transparent", "api");
          }, 2000);
        }
        // Add a temporary highlight effect
      }
    }

    // Emit event to show the footnote bubble at the specific location
    emitter.emit("showfootnotebubble", {
      id: footnote.threadId,
      order: footnote.order,
      position: {
        top: 100,
        left: 100,
      },
    });
  };

  const handleAccordionChange = (value: string) => {
    setIsModalOpen(value === "footnotes");
  };

  const handleTriggerClick = () => {
    setIsModalOpen(!isModalOpen);
  };

  useEffect(() => {
    const openHandler = (data: unknown) => {
      const footnoteData = data as FootnoteEventData;
      setIsModalOpen(true);

      setTimeout(() => {
        const footnote = document.getElementById(
          documentId + "-" + footnoteData.order
        );
        if (footnote) {
          footnote.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 100);
    };

    emitter?.on("showfootnotebubble", openHandler);

    return () => {
      emitter?.off("showfootnotebubble", openHandler);
    };
  }, [documentId]);
  const { t } = useTranslate();
  return (
    <Accordion
      type="single"
      collapsible
      className="w-full border-gray-200 !m-0  z-30"
      value={isModalOpen ? "footnotes" : ""}
      onValueChange={handleAccordionChange}
    >
      <AccordionItem
        value="footnotes"
        className="!p-0 !m-0 !rounded-none !bg-transparent !border-none"
      >
        <AccordionTrigger
          className="w-full hover:no-underline !p-2 !m-0 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          onClick={handleTriggerClick}
        >
          <div className="flex items-center gap-2 text-gray-600">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium ">
              {t("editor.footnotes")}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="h-[20vh] overflow-y-auto relative">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="text-sm text-muted-foreground">
                Loading footnotes...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-4">
              <div className="text-sm text-destructive">
                Failed to load footnotes
              </div>
            </div>
          ) : sortedFootnotes.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <div className="text-sm text-muted-foreground">
                No footnotes found
              </div>
            </div>
          ) : (
            <ScrollArea className="pr-4">
              <div className="">
                {sortedFootnotes.map((footnote: Footnote, index: number) => (
                  <div
                    key={footnote.id}
                    id={documentId + "-" + (index + 1)}
                    className="rounded-lg px-2 py-1 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleFootnoteClick(footnote)}
                      >
                        {editingFootnote === footnote.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full p-2 text-sm border rounded resize-none"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(footnote.id)}
                                className="text-xs"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                className="text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-foreground">
                            <sup className="text-[8px] text-gray-600 mr-1">
                              {index + 1}
                            </sup>
                            {footnote.content}
                          </div>
                        )}
                      </div>
                      {editingFootnote !== footnote.id && (
                        <div className="flex gap-1 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(footnote)}
                            className="h-6 w-6 p-0 hover:bg-gray-100 cursor-pointer"
                            title="Edit footnote"
                          >
                            <Edit2 className="h-3 w-3 text-gray-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(footnote)}
                            className="h-6 w-6 p-0 hover:bg-gray-100 cursor-pointer"
                            title="Delete footnote"
                          >
                            <Trash2Icon className="h-3 w-3 text-gray-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default FootnoteView;
