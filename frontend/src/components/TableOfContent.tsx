import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  FaList,
  FaArrowCircleLeft,
  FaChevronDown,
  FaChevronRight,
} from "react-icons/fa";
import { useEditor } from "@/contexts/EditorContext";
import { MAX_HEADING_LEVEL } from "@/../config";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";
import { Switch } from "./ui/switch";

interface Heading {
  text: string;
  level: number;
  id: string;
  number: string;
}

interface TableOfContentProps {
  documentId: string;
}

const TableOfContent: React.FC<TableOfContentProps> = ({ documentId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [synced, setSynced] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const { getQuill, quillEditors } = useEditor();

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

      // Create a numbering system for headings with subsection restart
      let counters = Array(MAX_HEADING_LEVEL).fill(0);

      const headingsData: Heading[] = Array.from(headingElements)
        .filter((f) => f.textContent !== "")
        .map((heading, index) => {
          let id = `heading-${index}`;
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
            text: heading.textContent,
            level,
            id,
            number,
          };
        });

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

      if (headingElements.length === 0) return;

      let currentHeading = null;
      let lastVisibleHeading = null;

      for (const heading of headingElements) {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= containerRect.top + 10) {
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
        setActiveHeadingId(currentHeading.id);
      }
    };

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
      };
    }
  }, [quill]);

  const scrollToHeading = (id: string) => {
    if (!quill) return;
    let otherKey = null;
    if (quillEditors.size > 1 && synced) {
      for (const key of quillEditors.keys()) {
        if (key !== documentId) {
          otherKey = key;
          break;
        }
      }
      const quill2 = getQuill(otherKey);
      if (quill2) {
        const el = quill2.root.querySelector(`#${id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          setActiveHeadingId(id);
        }
      }
    }

    const el = quill.root.querySelector(`#${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setActiveHeadingId(id);
    }
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

          // Get the simplified number
          const displayNumber = heading.number.split(".").pop() || "";

          return (
            <div
              key={heading.id}
              className={cn(
                "text-sm py-1.5 rounded-md transition-colors",
                isNested && `ml-${(heading.level - 1) * 3}`,
                isActive ? "bg-violet-50" : "hover:bg-gray-100"
              )}
              style={{
                paddingLeft: isNested ? `${(heading.level - 1) * 12}px` : "8px",
              }}
            >
              <div
                className={cn(
                  "flex items-center cursor-pointer",
                  isActive && "border-l-2 border-violet-700 pl-2"
                )}
                onClick={() => scrollToHeading(heading.id)}
              >
                {hasChildren && (
                  <button
                    className="mr-2 flex items-center justify-center w-5 h-5 rounded-sm hover:bg-violet-200 text-violet-700"
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
                {!hasChildren && <div className="mr-2 w-5 h-5" />}
                <span className="text-blue-600 text-xs font-medium mr-2 w-8">
                  {displayNumber}
                </span>
                <span
                  className={cn(
                    "text-left truncate flex-1",
                    isNested ? "text-slate-700" : "font-medium text-slate-900",
                    isActive && "font-semibold"
                  )}
                >
                  {heading.text}
                </span>
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
        className="absolute top-3 left-4 p-3 z-2"
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
            <Switch
              checked={synced}
              onCheckedChange={setSynced}
              className="ml-2"
            />
          </div>
          <div className="overflow-y-auto flex-grow">{renderTOC()}</div>
        </div>
      </div>
    </>
  );
};

export default TableOfContent;
