import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchFootnotes,
  deleteFootnote,
  updateFootnote,
  createFootnote,
} from "@/api/footnote";
import { FileText, Edit2, Trash2Icon, ChevronDown, Plus } from "lucide-react";
import { Button } from "../ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionReverseTrigger,
  AccordionTrigger,
} from "../ui/accordion";
import { ScrollArea } from "../ui/scroll-area";
import emitter from "@/services/eventBus";
import { useEditor } from "@/contexts/EditorContext";
import { useAuth } from "@/auth/use-auth-hook";
import Quill from "quill";
import { useTranslate } from "@tolgee/react";
import AvatarWrapper from "../ui/custom-avatar";
import ContentEditableDiv from "../ui/contentEditable";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

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

interface TemporaryFootnote {
  id: string;
  threadId: string;
  position: number;
  content: string;
  selectedText: string;
  range: QuillRange;
  isTemporary: true;
}

interface FootnoteEventData {
  id: string;
  order: number;
  position: {
    top: number;
    left: number;
  };
}

interface QuillRange {
  index: number;
  length: number;
  top?: number;
}

function FootnoteView({
  documentId,
  isEditable = true,
}: {
  readonly documentId: string;
  readonly isEditable?: boolean;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFootnote, setEditingFootnote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [temporaryFootnote, setTemporaryFootnote] =
    useState<TemporaryFootnote | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [footnoteToDelete, setFootnoteToDelete] = useState<Footnote | null>(null);
  const { getQuill } = useEditor();
  const { currentUser } = useAuth();
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

  // Create footnote mutation
  const createFootnoteMutation = useMutation({
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
        temporaryFootnote?.selectedText || ""
      ),
    onSuccess: (createdFootnote) => {
      if (createdFootnote?.id && temporaryFootnote) {
        // Update the Quill editor to highlight the text
        quill?.formatText(
          temporaryFootnote.range.index,
          temporaryFootnote.range.length,
          "footnote",
          {
            id: createdFootnote.threadId,
            order: createdFootnote.order,
          },
          "user"
        );

        // Reset creation state
        setTemporaryFootnote(null);

        // Invalidate and refetch footnotes
        queryClient.invalidateQueries({
          queryKey: [`footnotes-${documentId}`],
        });
      }
    },
    onError: (error) => {
      console.error("Error creating footnote:", error);
    },
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
      
      // Find the footnote to get its threadId
      const deletedFootnote = footnotesData?.find(f => f.id === footnoteId);
      if (quill && deletedFootnote) {
        const footnoteSpanList = quill.root.querySelectorAll(
          `span.footnote[data-id="${deletedFootnote.threadId}"]`  // Use threadId instead
        ) as HTMLElement[];
        
        if (footnoteSpanList.length > 0) {
          footnoteSpanList.forEach((span) => {
            const blot = Quill.find(span) as any;
            if (blot && blot.length) {
              const index = quill.getIndex(blot);
              const length = blot.length();
              quill.formatText(index, length, "footnote", false, "user");
            }
          });
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
    setFootnoteToDelete(footnote);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (footnoteToDelete) {
      try {
       deleteFootnoteMutation.mutate(footnoteToDelete.id);
      } catch (error) {
        console.error("Error deleting footnote:", error);
      }
    }
  };

  const handleCreateFootnote = async () => {
    if (!temporaryFootnote || !currentUser) {
      return;
    }

    // If content is empty, automatically clean up the temporary footnote
    if (!temporaryFootnote.content.trim()) {
      handleCancelCreateFootnote();
      return;
    }

    const end = temporaryFootnote.range.index + temporaryFootnote.range.length;

    try {
      await createFootnoteMutation.mutateAsync({
        content: temporaryFootnote.content.trim(),
        threadId: temporaryFootnote.threadId,
        start: temporaryFootnote.range.index,
        end,
      });
    } catch (error) {
      console.error("Error creating footnote:", error);
    }
  };

  const handleCancelCreateFootnote = () => {
    // Remove temporary footnote marker from editor
    if (temporaryFootnote && quill) {
      quill.formatText(
        temporaryFootnote.range.index,
        temporaryFootnote.range.length,
        "footnote",
        false,
        "user"
      );
    }

    setTemporaryFootnote(null);
  };

  const footnotes: Footnote[] = footnotesData || [];

  // Calculate position for new footnote based on its range index
  const calculateFootnotePosition = (rangeIndex: number): number => {
    if (!quill) return 0;

    const footnoteSpans = quill.root.querySelectorAll("span.footnote[data-id]");
    let position = 0;

    footnoteSpans.forEach((span) => {
      const blot = Quill.find(span) as any;
      if (blot) {
        const spanIndex = quill.getIndex(blot);
        if (spanIndex < rangeIndex) {
          position++;
        }
      }
    });

    return position;
  };

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
    let previousId: string | null = null;
    let repeatCount = 0;

    footnoteSpans.forEach((span, index) => {
      const id = span.getAttribute("data-id");

      if (id === previousId) {
        // Same as previous, this is a repeating element
        repeatCount++;
        span.setAttribute("data-counter", ""); // Don't show counter for repeating elements
      } else {
        // Different from previous ID
        if (repeatCount > 0) {
          // We had repeating elements, assign counter to the previous element (last in the sequence)
          footnoteSpans[index - 1].setAttribute(
            "data-counter",
            currentCounter.toString()
          );
          currentCounter++;
          repeatCount = 0;
        } else if (index > 0) {
          // Previous was a single element, assign counter to it
          footnoteSpans[index - 1].setAttribute(
            "data-counter",
            currentCounter.toString()
          );
          currentCounter++;
        }

        // Reset for current element (will be processed when we see the next different ID or at the end)
        span.setAttribute("data-counter", "");
      }

      previousId = id;
    });

    // Handle the last element in the array
    if (footnoteSpans.length > 0) {
      const lastSpan = footnoteSpans[footnoteSpans.length - 1];
      lastSpan.setAttribute("data-counter", currentCounter.toString());
    }

    return sortedFootnotes;
  };

  // Get active footnotes (already sorted by position)
  const sortedFootnotes = getActiveFootnotes();

  // Combine footnotes with temporary footnote for rendering
  const getCombinedFootnotes = () => {
    const combined: (Footnote | TemporaryFootnote)[] = [...sortedFootnotes];

    if (temporaryFootnote) {
      // Insert temporary footnote at the calculated position
      combined.splice(temporaryFootnote.position, 0, temporaryFootnote);
    }

    return combined;
  };

  const combinedFootnotes = getCombinedFootnotes();

  const handleFootnoteClick = (footnote: Footnote) => {
    // Find the footnote span in the editor and scroll to it
    if (quill) {
      const footnoteSpanList = quill.root.querySelectorAll(
        `span.footnote[data-id="${footnote.threadId}"]`
      ) as HTMLElement;
      if (footnoteSpanList?.length > 0) {
        // Scroll the footnote span into view
        footnoteSpanList[0].scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });

        footnoteSpanList.forEach((footnoteSpan) => {
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
              quill.formatText(
                index,
                length,
                "background",
                "transparent",
                "api"
              );
            }, 2000);
          }
          // Add a temporary highlight effect
        });
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

    // Listen for footnote creation events from toolbar
    const createFootnoteHandler = (data: any) => {
      // Only handle events for this specific document
      if (data.documentId !== documentId) return;

      const range = data.range;
      const text = quill?.getText(range.index, range.length) || "";

      // Calculate position for the temporary footnote
      const position = calculateFootnotePosition(range.index);

      // Create temporary footnote
      const tempFootnote: TemporaryFootnote = {
        id: crypto.randomUUID(),
        threadId: crypto.randomUUID(),
        position,
        content: "",
        selectedText: text,
        range,
        isTemporary: true,
      };

      // Add temporary footnote marker to the editor to show the number
      if (quill) {
        quill.formatText(
          range.index,
          range.length,
          "footnote",
          {
            id: tempFootnote.threadId,
            order: position + 1, // Show the order number
          },
          "user"
        );
      }

      setTemporaryFootnote(tempFootnote);
      setIsModalOpen(true);
    };

    emitter?.on("showfootnotebubble", openHandler);
    emitter?.on("createFootnote", createFootnoteHandler);

    return () => {
      emitter?.off("showfootnotebubble", openHandler);
      emitter?.off("createFootnote", createFootnoteHandler);
    };
  }, [documentId, quill]);

  const { t } = useTranslate();

  return (
    <>
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
        <AccordionReverseTrigger
          className="footnote-trigger w-full hover:no-underline !p-2 !m-0 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          onClick={handleTriggerClick}
        >
          <div className="flex items-center gap-2 text-gray-600">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium ">
              {t("editor.footnotes")}
            </span>
          </div>
        </AccordionReverseTrigger>
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
          ) : (
            <ScrollArea className="pr-4">
              <div className="">
                {/* Footnotes with inline creation */}
                {combinedFootnotes.length === 0 ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="text-sm text-muted-foreground">
                      No footnotes found
                    </div>
                  </div>
                ) : (
                  combinedFootnotes.map(
                    (footnote: Footnote | TemporaryFootnote, index: number) => (
                      <div
                        key={footnote.id}
                        id={documentId + "-" + (index + 1)}
                        className="rounded-lg px-2 py-1 bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {"isTemporary" in footnote ? (
                              // Render temporary footnote input
                              <div className="text-sm text-foreground">
                                <sup className="text-[8px] text-gray-600 mr-1">
                                  {index + 1}
                                </sup>
                                <input
                                  type="text"
                                  value={footnote.content}
                                  onChange={(e) =>
                                    setTemporaryFootnote({
                                      ...footnote,
                                      content: e.target.value,
                                    })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleCreateFootnote();
                                    } else if (e.key === "Escape") {
                                      e.preventDefault();
                                      handleCancelCreateFootnote();
                                    }
                                  }}
                                  onBlur={() => {
                                    // Automatically clean up temporary footnote when focus is lost
                                    handleCancelCreateFootnote();
                                  }}
                                  className="inline bg-transparent border-none outline-none text-sm text-foreground flex-1"
                                  autoFocus
                                  disabled={createFootnoteMutation.isPending}
                                />
                              </div>
                            ) : (
                              // Render existing footnote
                              <div
                                className="cursor-pointer"
                                onClick={() =>
                                  handleFootnoteClick(footnote as Footnote)
                                }
                              >
                                {editingFootnote === footnote.id ? (
                                  <div className="text-sm text-foreground">
                                    <sup className="text-[8px] text-gray-600 mr-1">
                                      {index + 1}
                                    </sup>
                                    <input
                                      type="text"
                                      value={editContent}
                                      onChange={(e) =>
                                        setEditContent(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleSaveEdit(footnote.id);
                                        } else if (e.key === "Escape") {
                                          e.preventDefault();
                                          handleCancelEdit();
                                        }
                                      }}
                                      className="inline bg-transparent border-none outline-none text-sm text-foreground flex-1"
                                      autoFocus
                                      disabled={
                                        updateFootnoteMutation.isPending
                                      }
                                    />
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
                            )}
                          </div>
                          {isEditable &&
                            !("isTemporary" in footnote) &&
                            editingFootnote !== footnote.id && (
                              <div className="flex gap-1 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleEdit(footnote as Footnote)
                                  }
                                  className="h-6 w-6 p-0 hover:bg-gray-100 cursor-pointer"
                                  title="Edit footnote"
                                >
                                  <Edit2 className="h-3 w-3 text-gray-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleDelete(footnote as Footnote)
                                  }
                                  className="h-6 w-6 p-0 hover:bg-gray-100 cursor-pointer"
                                  title="Delete footnote"
                                >
                                  <Trash2Icon className="h-3 w-3 text-gray-600" />
                                </Button>
                              </div>
                            )}
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </ScrollArea>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>

    <ConfirmationModal
      open={showDeleteModal}
      onClose={() => {
        setShowDeleteModal(false);
        setFootnoteToDelete(null);
      }}
      onConfirm={confirmDelete}
      title="Delete Footnote"
      message="Are you sure you want to delete this footnote? This action cannot be undone."
      confirmText="Delete"
      loading={deleteFootnoteMutation.isPending}
    />
    </>
  );
}

export default FootnoteView;
