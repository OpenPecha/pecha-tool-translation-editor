import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { FaList, FaArrowCircleLeft } from "react-icons/fa";
import { useEditor } from "@/contexts/EditorContext";
import { MAX_HEADING_LEVEL } from "@/../config";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";
interface Heading {
  text: string;
  level: number;
  id: string;
}

interface TableOfContentProps {
  documentId: string;
}

const TableOfContent: React.FC<TableOfContentProps> = ({ documentId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const { getQuill } = useEditor();

  const quill = getQuill(documentId);

  const generateList = () => {
    return Array.from(
      { length: MAX_HEADING_LEVEL },
      (_, i) => `h${i + 1}`
    ).join(",");
  };

  useEffect(() => {
    const extractHeadings = () => {
      if (!quill) return;
      const headingElements = quill.root.querySelectorAll(generateList());
      const headingsData: Heading[] = Array.from(headingElements).map(
        (heading, index) => {
          const id = `heading-${index}`;
          heading.setAttribute("id", id);
          return {
            text: heading.textContent || "",
            level: parseInt(heading.tagName[1]),
            id,
          };
        }
      );

      setHeadings(headingsData);
      const initialExpanded: { [key: string]: boolean } = {};
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
    return () => observer.disconnect();
  }, [quill]);

  useEffect(() => {
    const updateActiveHeading = () => {
      if (!quill) return;
      const container = quill.root;
      const containerRect = container.getBoundingClientRect();
      const headingElements = Array.from(
        container.querySelectorAll(generateList())
      );

      // If no headings found, keep the current activeHeadingId
      if (headingElements.length === 0) return;

      let currentHeading = null;
      let lastVisibleHeading = null;

      for (const heading of headingElements) {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= containerRect.top + 10) {
          // Keep track of the last visible heading
          lastVisibleHeading = heading;
        } else {
          // We've found the first heading below viewport
          currentHeading = lastVisibleHeading;
          break;
        }
      }

      // If we're at the end and haven't set currentHeading, use the last visible heading
      if (!currentHeading && lastVisibleHeading) {
        currentHeading = lastVisibleHeading;
      }

      // Only update if we found a heading
      if (currentHeading && currentHeading.id) {
        setActiveHeadingId(currentHeading.id);
      }
    };

    const debouncedUpdate = debounce(updateActiveHeading, 100);

    const editorContainer = quill?.root;
    if (editorContainer) {
      editorContainer.addEventListener("scroll", debouncedUpdate);
      window.addEventListener("resize", debouncedUpdate); // Also handle window resizes

      // Initial update
      updateActiveHeading();

      return () => {
        editorContainer.removeEventListener("scroll", debouncedUpdate);
        window.removeEventListener("resize", debouncedUpdate);
        debouncedUpdate.cancel();
      };
    }
  }, [quill]);

  const scrollToHeading = (id: string) => {
    if (!quill) return;
    const el = quill.root.querySelector(`#${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setActiveHeadingId(id);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderTOC = () => {
    if (!headings.length)
      return (
        <div className="text-sm italic text-gray-400">No headings found</div>
      );

    return (
      <div className="space-y-1">
        {headings.map((heading, index) => {
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

          return (
            <div
              key={heading.id}
              className={cn(
                "text-sm py-1.5 pl-2    transition-colors ",
                isNested ? "text-slate-700" : "font-medium text-slate-900",
                isActive
                  ? "  border-l-2 border-violet-700"
                  : "hover:bg-gray-100"
              )}
              // style={{ paddingLeft: `${(heading.level - 1) * 16}px` }}
            >
              <div className="flex items-center">
                {hasChildren && (
                  <button
                    className="mr-1 p-0.5 cursor-pointer rounded-sm hover:bg-violet-200"
                    onClick={() => toggleExpand(heading.id)}
                    aria-label={
                      isExpanded ? "Collapse section" : "Expand section"
                    }
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-blue-600" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-blue-600" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => scrollToHeading(heading.id)}
                  className={cn(
                    "text-left truncate flex-1 cursor-pointer",
                    isActive && "font-semibold pl-2"
                  )}
                >
                  {heading.text}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-3 left-4 p-3 z-10"
        aria-label="Toggle Table of Contents"
        size="sm"
        variant="outline"
      >
        <FaList className="w-5 h-5" />
      </Button>

      <div
        className={cn(
          "absolute inset-y-0 left-0 w-64 bg-white shadow-xl transition-transform duration-300 ease-in-out z-20",
          isOpen ? "translate-x-0 " : "-translate-x-full hidden"
        )}
      >
        <div className="p-4 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaArrowCircleLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold">Table of Contents</h3>
          </div>
          <div className="overflow-y-auto flex-grow">{renderTOC()}</div>
        </div>
      </div>
    </>
  );
};

export default TableOfContent;
