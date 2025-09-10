import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Button } from "./ui/button";
import { FaList, FaChevronDown, FaChevronRight } from "react-icons/fa";
import { useEditor } from "@/contexts/EditorContext";
import { MAX_HEADING_LEVEL } from "@/utils/editorConfig";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";
import { HiArrowLeft } from "react-icons/hi2";
import {
  useTableOfContentSyncStore,
  useTableOfContentOpenStore,
} from "@/stores/tableOfContentStore";
import { BookOpen, Dot } from "lucide-react";
import { useTranslate } from "@tolgee/react";

interface Heading {
  text: string;
  level: number;
  id: string;
  number: string;
}

interface TableOfContentProps {
  documentId: string;
}

type ExpandedSections = { [key: string]: boolean };

const TableOfContent: React.FC<TableOfContentProps> = ({ documentId }) => {
  const { isOpen, setIsOpen, addDocumentId, removeDocumentId } =
    useTableOfContentOpenStore();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const { synced } = useTableOfContentSyncStore();
  const { getQuill } = useEditor();
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>(
    {}
  );
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const quill = getQuill(documentId);
  const generateList = useCallback(() => {
    return Array.from(
      { length: MAX_HEADING_LEVEL },
      (_, i) => `h${i + 1}`
    ).join(",");
  }, []);

  // Create a debounced version of setActiveHeadingId
  const debouncedSetActiveHeadingIdRef = useRef(
    debounce((id: string | null) => {
      setActiveHeadingId(id);
    }, 100)
  );

  // Cleanup the debounced function when component unmounts
  useEffect(() => {
    return () => {
      debouncedSetActiveHeadingIdRef.current.cancel();
    };
  }, []);

  // Add/remove document ID when component mounts/unmounts
  useEffect(() => {
    addDocumentId(documentId);
    return () => removeDocumentId(documentId);
  }, [documentId, addDocumentId, removeDocumentId]);

  // Define updateActiveHeading at the component level so it can be used in multiple places
  const updateActiveHeading = useCallback(() => {
    if (!quill) return;
    const container = quill.root;
    const containerRect = container.getBoundingClientRect();
    const headingElements = Array.from(
      container.querySelectorAll(generateList())
    );

    if (headingElements.length === 0) return;

    let currentHeading = null;
    let lastVisibleHeading = null;

    for (const heading of headingElements) {
      const rect = heading.getBoundingClientRect();
      if (rect.top <= containerRect.top + 100) {
        lastVisibleHeading = heading;
      } else {
        currentHeading = lastVisibleHeading;
        break;
      }
    }

    if (!currentHeading && lastVisibleHeading) {
      currentHeading = lastVisibleHeading;
    }

    if (currentHeading && currentHeading.id) {
      debouncedSetActiveHeadingIdRef.current(currentHeading.id);
    }
  }, [quill, generateList, debouncedSetActiveHeadingIdRef]);
  const isTableOpen = isOpen(documentId);
  useEffect(() => {
    if (!isTableOpen) return;
    const extractHeadings = () => {
      if (!quill) return;
      const headingElements = quill.root.querySelectorAll(generateList());

      // Create a numbering system for headings with subsection restart
      const counters = Array(MAX_HEADING_LEVEL).fill(0);

      const headingsData: Heading[] = Array.from(headingElements)
        .filter((f) => f.textContent !== "")
        .map((heading, index) => {
          const id = `heading-${index}`;
          heading.setAttribute("id", id);

          const level = parseInt(heading.tagName[1]);

          // Reset all lower level counters
          for (let i = level; i < MAX_HEADING_LEVEL; i++) {
            counters[i] = 0;
          }

          // Increment the counter for current level
          counters[level - 1]++;

          // Create the numbering (e.g. 1.1, 1.2, 2.1)
          // Only include numbers up to the current level
          const number = counters.slice(0, level).join(".");

          return {
            text: heading.textContent || "",
            level,
            id,
            number,
          };
        });

      setHeadings(headingsData);
      const initialExpanded: ExpandedSections = {};
      headingsData.forEach((h) => {
        if (h.level === 1 || h.level === 2) initialExpanded[h.id] = true;
      });
      setExpandedSections(initialExpanded);
    };

    extractHeadings();
    const observer = new MutationObserver(extractHeadings);
    if (quill) {
      observer.observe(quill.root, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    // Use the updateActiveHeading function defined above
    const debouncedUpdate = debounce(updateActiveHeading, 100);

    const editorContainer = quill?.root;
    if (editorContainer) {
      editorContainer.addEventListener("scroll", debouncedUpdate);
      window.addEventListener("resize", debouncedUpdate);

      updateActiveHeading();

      return () => {
        editorContainer.removeEventListener("scroll", debouncedUpdate);
        window.removeEventListener("resize", debouncedUpdate);
        debouncedUpdate.cancel();
        observer.disconnect();
      };
    }
  }, [quill, isTableOpen, documentId, generateList, updateActiveHeading]);

  const handleToggleTOC = () => {
    setIsOpen(documentId, !isOpen(documentId));
    const editorContainer = quill?.root;

    // Add a small scroll offset to improve visibility of the current position
    // this should trigger line update due to scroll change
    if (editorContainer) {
      const currentScrollTop = editorContainer.scrollTop;
      editorContainer.scrollTop = currentScrollTop + 1;
    }
  };
  const { t } = useTranslate();
  return (
    <>
      <Button
        onClick={handleToggleTOC}
        className={`top-3  p-3 z-2 ${isOpen(documentId) ? "hidden" : ""}`}
        aria-label="Toggle Table of Contents"
        size="sm"
        variant="outline"
      >
        <FaList className="w-5 h-5" />
      </Button>

      <div
        className={cn(
          "relative inset-y-0 left-0 max-w-64 transition-all duration-300 overflow-hidden ease-in-out z-20",
          isOpen(documentId) ? "translate-x-0" : "-translate-x-full hidden"
        )}
      >
        <div className="p-4 h-full flex gap-4 flex-col">
          <div className="flex items-center mb-3">
            <button
              onClick={() => setIsOpen(documentId, false)}
              className=" hover:text-gray-700 hover:bg-gray-200 hover:shadow rounded-full p-1 w-fit mr-3  cursor-pointer"
            >
              <HiArrowLeft className="w-5 h-5" />
            </button>
            <BookOpen className="mr-2 text-secondary-600" size={20} />
            <h2 className="text-lg font-semibold">
              {t("documents.toc")}
            </h2>
          </div>

          <div className="overflow-y-auto flex-grow">
            <Toc
              headings={headings}
              documentId={documentId}
              synced={synced}
              expandedSections={expandedSections}
              setExpandedSections={setExpandedSections}
              activeHeadingId={activeHeadingId}
              setActiveHeadingId={debouncedSetActiveHeadingIdRef.current}
              updateActiveHeading={updateActiveHeading}
            />
          </div>
        </div>
      </div>
    </>
  );
};

interface TocProps {
  headings: Heading[];
  synced: boolean;
  documentId: string;
  expandedSections: ExpandedSections;
  activeHeadingId: string | null;
  setExpandedSections: (sections: ExpandedSections) => void;
  setActiveHeadingId: (id: string | null) => void;
  updateActiveHeading: () => void;
}

const Toc = React.memo(function Toc({
  headings,
  synced,
  documentId,
  expandedSections,
  activeHeadingId,
  setExpandedSections,
  setActiveHeadingId,
  updateActiveHeading,
}: TocProps) {
  const { getQuill, quillEditors } = useEditor();
  const quill = getQuill(documentId);

  const scrollToHeading = useCallback(
    (id: string) => {
      if (!quill) return;

      const el = quill.root.querySelector(`#${id}`);
      if (!el) return;

      const editorContainer = quill.root.closest(".ql-editor");
      if (!editorContainer) return;

      const containerRect = editorContainer.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const relativeTop =
        elRect.top - containerRect.top + editorContainer.scrollTop;
      editorContainer.scrollTo({
        top: relativeTop,
        behavior: "smooth",
      });

      // Call updateActiveHeading after scrolling to ensure UI is updated
      setTimeout(() => {
        updateActiveHeading();
      }, 1000);

      if (quillEditors.size > 1 && synced) {
        requestAnimationFrame(() => {
          for (const key of quillEditors.keys()) {
            if (key !== documentId) {
              const otherQuill = getQuill(key);
              if (!otherQuill) continue;

              const otherEl = otherQuill.root.querySelector(`#${id}`);
              if (!otherEl) continue;

              const otherEditorContainer =
                otherQuill.root.closest(".ql-editor");
              if (!otherEditorContainer) continue;

              const otherContainerRect =
                otherEditorContainer.getBoundingClientRect();
              const otherElRect = otherEl.getBoundingClientRect();
              const otherRelativeTop =
                otherElRect.top -
                otherContainerRect.top +
                otherEditorContainer.scrollTop;

              otherEditorContainer.scrollTo({
                top: otherRelativeTop,
                behavior: "smooth",
              });
            }
          }
        });
      }
    },
    [
      quill,
      documentId,
      quillEditors,
      synced,
      setActiveHeadingId,
      getQuill,
      updateActiveHeading,
    ]
  );

  const toggleExpand = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newExpandedSections = {
        ...expandedSections,
        [id]: !expandedSections[id],
      };
      setExpandedSections(newExpandedSections);
    },
    [expandedSections, setExpandedSections]
  );

  // Memoize the visibility calculation for headings
  const visibleHeadings = useMemo(() => {
    return headings
      .map((heading, index) => {
        const isNested = heading.level > 1;
        const hasChildren =
          index < headings.length - 1 &&
          headings[index + 1].level > heading.level;
        const isExpanded = expandedSections[heading.id];
        const isActive = activeHeadingId === heading.id;

        let isVisible = true;
        for (let i = 0; i < index; i++) {
          const potentialParent = headings[i];
          if (
            potentialParent.level < heading.level &&
            headings
              .slice(i + 1, index)
              .every((h) => h.level > potentialParent.level)
          ) {
            if (!expandedSections[potentialParent.id]) {
              isVisible = false;
              break;
            }
          }
        }

        if (!isVisible || !heading.text.trim()) return null;

        return {
          heading,
          isNested,
          hasChildren,
          isExpanded,
          isActive,
        };
      })
      .filter(Boolean);
  }, [headings, expandedSections, activeHeadingId]);

  if (!headings.length) {
    return (
      <div className="text-sm italic text-gray-500">No headings found</div>
    );
  }

  return (
    <div className="space-y-1">
      {visibleHeadings.map((item) => {
        if (!item) return null;
        const { heading, isNested, hasChildren, isExpanded, isActive } = item;

        return (
          <div
            key={heading.id}
            className={cn(
              " py-1.5 rounded-md transition-colors",
              isNested && `ml-${(heading.level - 1) * 3}`,
              isActive
                ? "bg-secondary-50 text-secondary-700 border-r-2 border-secondary-500 pr-2"
                : "hover:bg-neutral-100 dark:hover:bg-neutral-700"
            )}
            style={{
              fontSize: 10,
            }}
          >
            <div
              className={cn("flex items-center cursor-pointer")}
              onClick={() => scrollToHeading(heading.id)}
            >
              {hasChildren && (
                <button
                  className="mr-2 flex items-center justify-center w-5 h-5 rounded-sm hover:bg-secondary-200 text-secondary-700"
                  onClick={(e) => toggleExpand(heading.id, e)}
                  aria-label={
                    isExpanded ? "Collapse section" : "Expand section"
                  }
                  title={isExpanded ? "Collapse section" : "Expand section"}
                >
                  {isExpanded ? (
                    <FaChevronDown size={12} />
                  ) : (
                    <FaChevronRight size={12} />
                  )}
                </button>
              )}
              {!hasChildren && (
                <button
                  className="mr-2 flex items-center justify-center w-5 h-5 rounded-sm hover:bg-secondary-200 text-secondary-700"
                  type="button"
                >
                  <Dot />
                </button>
              )}
              {/* {!hasChildren && <div className="mr-2 w-5 h-5" />} */}
              <span className={cn(" truncate flex-1 font-monlam pt-1")}>
                {heading.text}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
});
export default TableOfContent;
