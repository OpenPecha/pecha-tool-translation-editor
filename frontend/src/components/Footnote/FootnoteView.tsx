import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchFootnotes,
  deleteFootnote,
  updateFootnote,
  createFootnote,
} from "@/api/footnote";
import { FileText, Edit2, Trash2Icon } from "lucide-react";
import { Button } from "../ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionReverseTrigger,
} from "../ui/accordion";
import { ScrollArea } from "../ui/scroll-area";
import emitter from "@/services/eventBus";
import { useEditor } from "@/contexts/EditorContext";
import { useAuth } from "@/auth/use-auth-hook";
import Quill from "quill";
import { useTranslate } from "@tolgee/react";
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
  const [isQuillReady, setIsQuillReady] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFootnote, setEditingFootnote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [temporaryFootnote, setTemporaryFootnote] =
    useState<TemporaryFootnote | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [footnoteToDelete, setFootnoteToDelete] = useState<Footnote | null>(
    null
  );
  const { getQuill } = useEditor();
  const { currentUser } = useAuth();
  const quill = getQuill(documentId);
  const queryClient = useQueryClient();

  // Wait for Quill to be ready and have content
  useEffect(() => {
    if (!quill) return;

    const checkQuillReady = () => {
      // Check if quill has been initialized and has content or is ready to receive content
      if (
        quill.getLength() >= 1 ||
        quill.root.innerHTML.includes('class="ql-editor"')
      ) {
        setIsQuillReady(true);
      }
    };

    // Check immediately
    checkQuillReady();

    // Also listen for text changes to ensure content is loaded
    const textChangeHandler = () => {
      checkQuillReady();
    };

    quill.on("text-change", textChangeHandler);

    // Cleanup
    return () => {
      quill.off("text-change", textChangeHandler);
    };
  }, [quill]);

  const {
    data: footnotesData,
    isLoading,
    error,
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
      const deletedFootnote = footnotesData?.find((f: Footnote) => f.id === footnoteId);
      if (quill && deletedFootnote) {
        const footnoteSpanList = Array.from(quill.root.querySelectorAll(
          `span.footnote[data-id="${deletedFootnote.threadId}"]`
        )) as HTMLElement[];

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

  // Detect nested footnotes using both range overlap and DOM traversal
  const detectNestedFootnotes = () => {
    if (!quill) return { nestedRelations: new Map(), footnoteRanges: new Map() };

    const footnoteSpans = quill.root.querySelectorAll("span.footnote[data-id]");
    const footnoteRanges = new Map<string, { start: number; end: number; spans: HTMLElement[] }>();
    const nestedRelations = new Map<string, { nestedType: string; parentId?: string; childrenIds: string[] }>();

    // Step 1: Collect range information for each footnote
    footnoteSpans.forEach((span) => {
      const threadId = span.getAttribute("data-id");
      if (!threadId) return;

      const blot = Quill.find(span) as any;
      if (!blot) return;

      const spanIndex = quill.getIndex(blot);
      const spanLength = span.textContent?.length || 0;

      if (!footnoteRanges.has(threadId)) {
        footnoteRanges.set(threadId, {
          start: spanIndex,
          end: spanIndex + spanLength,
          spans: []
        });
      }

      const range = footnoteRanges.get(threadId)!;
      range.spans.push(span as HTMLElement);
      // Update range to encompass all instances
      range.start = Math.min(range.start, spanIndex);
      range.end = Math.max(range.end, spanIndex + spanLength);
    });

    // Step 2: Detect overlapping ranges (nested footnotes)
    const threadIds = Array.from(footnoteRanges.keys());
    
    for (let i = 0; i < threadIds.length; i++) {
      for (let j = i + 1; j < threadIds.length; j++) {
        const threadA = threadIds[i];
        const threadB = threadIds[j];
        const rangeA = footnoteRanges.get(threadA)!;
        const rangeB = footnoteRanges.get(threadB)!;

        // Check for overlap
        const hasOverlap = !(rangeA.end <= rangeB.start || rangeB.end <= rangeA.start);
        
        if (hasOverlap) {
          // Determine parent-child relationship based on range containment
          const aContainsB = rangeA.start <= rangeB.start && rangeA.end >= rangeB.end;
          const bContainsA = rangeB.start <= rangeA.start && rangeB.end >= rangeA.end;
          
          if (aContainsB && !bContainsA) {
            // A is parent, B is nested
            nestedRelations.set(threadA, { 
              nestedType: "parent", 
              childrenIds: [...(nestedRelations.get(threadA)?.childrenIds || []), threadB] 
            });
            nestedRelations.set(threadB, { 
              nestedType: "nested", 
              parentId: threadA, 
              childrenIds: [] 
            });
          } else if (bContainsA && !aContainsB) {
            // B is parent, A is nested
            nestedRelations.set(threadB, { 
              nestedType: "parent", 
              childrenIds: [...(nestedRelations.get(threadB)?.childrenIds || []), threadA] 
            });
            nestedRelations.set(threadA, { 
              nestedType: "nested", 
              parentId: threadB, 
              childrenIds: [] 
            });
          }
        }
      }
    }

    // Step 3: Also check DOM tree for nested relationships
    footnoteSpans.forEach((span) => {
      const threadId = span.getAttribute("data-id");
      if (!threadId) return;

      // Check if this span is nested inside another footnote span
      let parent = span.parentElement;
      while (parent && parent !== quill.root) {
        if (parent.classList.contains("footnote") && parent.getAttribute("data-id")) {
          const parentThreadId = parent.getAttribute("data-id");
          if (parentThreadId && parentThreadId !== threadId) {
            // Found a DOM-based nesting relationship
            nestedRelations.set(parentThreadId, { 
              nestedType: "parent", 
              childrenIds: [...(nestedRelations.get(parentThreadId)?.childrenIds || []), threadId] 
            });
            nestedRelations.set(threadId, { 
              nestedType: "nested", 
              parentId: parentThreadId, 
              childrenIds: [] 
            });
            break;
          }
        }
        parent = parent.parentElement;
      }
    });

    return { nestedRelations, footnoteRanges };
  };

  // Get active footnotes from the editor content
  const getActiveFootnotes = (): Footnote[] => {
    if (!quill) return footnotes;

    // Get all footnote spans in the editor
    const footnoteSpans = quill.root.querySelectorAll("span.footnote[data-id]");
    const activeThreadIds = new Set<string>();
    const footnotePositions = new Map<string, number>();

    // Detect nested footnotes
    const { nestedRelations, footnoteRanges } = detectNestedFootnotes();

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

    // Sort footnotes by their end position (for nested footnotes, use range ending index)
    const sortedFootnotes = activeFootnotes.sort((a, b) => {
      const rangeA = footnoteRanges.get(a.threadId);
      const rangeB = footnoteRanges.get(b.threadId);
      
      const endA = rangeA ? rangeA.end : footnotePositions.get(a.threadId) ?? 0;
      const endB = rangeB ? rangeB.end : footnotePositions.get(b.threadId) ?? 0;
      
      return endA - endB;
    });

    // Update counter values and nested attributes on footnote elements
    let currentCounter = 1;
    const processedThreadIds = new Set<string>();

    sortedFootnotes.forEach((footnote) => {
      if (processedThreadIds.has(footnote.threadId)) return;

      const spans = Array.from(footnoteSpans).filter(
        span => span.getAttribute("data-id") === footnote.threadId
      );

      spans.forEach((span) => {
        const relation = nestedRelations.get(footnote.threadId);
        
        // Apply nested attributes (for hover logic only, no visual styling)
        if (relation) {
          span.setAttribute("data-nested-type", relation.nestedType);
          
          if (relation.parentId) {
            span.setAttribute("data-parent-id", relation.parentId);
          } else {
            span.removeAttribute("data-parent-id");
          }
          
          if (relation.childrenIds.length > 0) {
            span.setAttribute("data-children-ids", relation.childrenIds.join(","));
          } else {
            span.removeAttribute("data-children-ids");
          }
        } else {
          // Remove nested attributes if not nested
          span.removeAttribute("data-nested-type");
          span.removeAttribute("data-parent-id");
          span.removeAttribute("data-children-ids");
        }
      });

      // Assign counter - only for the last span of each footnote group
      const lastSpan = spans[spans.length - 1];
      if (lastSpan) {
        lastSpan.setAttribute("data-counter", currentCounter.toString());
        // Clear counter from other spans of the same footnote
        spans.slice(0, -1).forEach(span => span.setAttribute("data-counter", ""));
      }

      processedThreadIds.add(footnote.threadId);
      currentCounter++;
    });

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

  // Helper function to apply highlighting with same logic as hover
  const applyFootnoteHighlighting = (footnoteId: string, isHighlighted: boolean) => {
    const allFootnoteSpans = document.querySelectorAll(
      `span.footnote[data-id="${footnoteId}"]`
    );
    
    allFootnoteSpans.forEach((span) => {
      const nestedType = span.getAttribute("data-nested-type");
      const childrenIds = span.getAttribute("data-children-ids")?.split(",").filter(Boolean) || [];
      
      if (isHighlighted) {
        // All footnotes use the same base highlighting
        span.classList.add("footnote-highlighted");
        
        // When highlighting parent, highlight children with different style
        if (nestedType === "parent") {
          childrenIds.forEach(childId => {
            const childSpans = document.querySelectorAll(`span.footnote[data-id="${childId}"]`);
            childSpans.forEach(childSpan => {
              childSpan.classList.add("footnote-inner-highlighted");
            });
          });
        }
        
        // When highlighting nested footnote, DO NOT highlight parent
        // Only the inner footnote itself gets highlighted
      } else {
        // Remove all highlighting classes
        span.classList.remove("footnote-highlighted", "footnote-inner-highlighted");
        
        // Remove highlighting from children if this is a parent
        if (nestedType === "parent") {
          childrenIds.forEach(childId => {
            const childSpans = document.querySelectorAll(`span.footnote[data-id="${childId}"]`);
            childSpans.forEach(childSpan => {
              childSpan.classList.remove("footnote-inner-highlighted");
            });
          });
        }
      }
    });
  };

  const handleFootnoteClick = (footnote: Footnote) => {
    // Find the footnote span in the editor and scroll to it
    if (quill) {
      const footnoteSpanList = Array.from(quill.root.querySelectorAll(
        `span.footnote[data-id="${footnote.threadId}"]`
      )) as HTMLElement[];
      if (footnoteSpanList.length > 0) {
        // Scroll the footnote span into view
        footnoteSpanList[0].scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
        
        // Apply highlighting with same logic as hover
        applyFootnoteHighlighting(footnote.threadId, true);
        
        // Remove highlighting after 2 seconds
        setTimeout(() => {
          applyFootnoteHighlighting(footnote.threadId, false);
        }, 2000);
      }
    }

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
      console.log("footnoteData", footnoteData);
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

  // Don't render footnote functionality until Quill is ready
  if (!isQuillReady) {
    return null; // or a loading spinner
  }

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
                      (
                        footnote: Footnote | TemporaryFootnote,
                        index: number
                      ) => (
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
