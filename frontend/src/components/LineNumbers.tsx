import {
  useRef,
  useState,
  useEffect,
  useCallback,
  memo,
  startTransition,
  RefObject,
} from "react";
import { debounce } from "lodash";
import { useParams } from "react-router-dom";
import { useEditor } from "@/contexts/EditorContext";
import useLocalStorage from "@/hooks/useLocalStorage";
import { FaBookmark, FaChevronUp, FaChevronDown } from "react-icons/fa";
import { createPortal } from "react-dom";
import { useTranslate } from "@tolgee/react";

const offsetTop = 0;

interface LineNumberVirtualizedProps {
  editorRef: RefObject<HTMLDivElement>;
  documentId: string;
}

const LineNumberVirtualized = ({
  editorRef,
  documentId,
}: LineNumberVirtualizedProps) => {
  const { t } = useTranslate();
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const { getQuill, activeEditor } = useEditor();
  const observerRef = useRef<IntersectionObserver | null>(null);

  const [lineNumbers, setLineNumbers] = useState<
    Array<{
      number: number;
      top: number;
      height: number;
      lineHeight?: string;
      calculated?: boolean;
    }>
  >([]);
  const [bookmarks, setBookmarks] = useLocalStorage<number[]>(
    `${documentId}-bookmarks`,
    []
  );
  const [currentBookmarkIndex, setCurrentBookmarkIndex] = useState<number>(-1);
  const [, setShowBookmarkPopup] = useState(false);
  const [maxLineWidth, setMaxLineWidth] = useState(3); // Default minimum width

  const handleDoubleClick = (lineNumber: number) => {
    if (bookmarks.includes(lineNumber)) {
      setBookmarks(bookmarks.filter((bm) => bm !== lineNumber));
      // Reset current index if we removed the current bookmark
      if (bookmarks[currentBookmarkIndex] === lineNumber) {
        setCurrentBookmarkIndex(-1);
      }
    } else {
      setBookmarks([...bookmarks, lineNumber].sort((a, b) => a - b));
    }
  };

  const isBookmarkInViewport = useCallback(
    (lineNumber: number) => {
      const editorContainer = editorRef?.current?.querySelector(".ql-editor");
      const lineNumberSpan = lineNumbersRef.current?.querySelector(
        `.line-number[id$="-line-${lineNumber}"]`
      ) as HTMLElement;

      if (!editorContainer || !lineNumberSpan) return false;

      const containerRect = editorContainer.getBoundingClientRect();
      const lineTop = parseFloat(lineNumberSpan.style.top);
      const scrollTop = editorContainer.scrollTop;

      // Check if bookmark is within viewport
      return !(
        lineTop < scrollTop || lineTop > scrollTop + containerRect.height
      );
    },
    [editorRef]
  );

  const scrollToBookmark = (lineNumber: number) => {
    const lineNumberSpan = lineNumbersRef.current?.querySelector(
      `.line-number[id$="-line-${lineNumber}"]`
    ) as HTMLElement;

    if (lineNumberSpan) {
      const editorContainer = editorRef?.current?.querySelector(".ql-editor");
      if (editorContainer && lineNumberSpan) {
        const targetTop = parseFloat(lineNumberSpan.style.top);

        // Use scrollTo with smooth behavior instead of directly setting scrollTop
        editorContainer.scrollTo({
          top: targetTop,
          behavior: "smooth",
        });
      }
    }
  };

  const handleScrollToNextBookmark = () => {
    if (bookmarks.length === 0) return;

    let newIndex = currentBookmarkIndex + 1;
    if (newIndex >= bookmarks.length) newIndex = 0;

    setCurrentBookmarkIndex(newIndex);
    scrollToBookmark(bookmarks[newIndex]);
    setShowBookmarkPopup(false);
  };

  const handleScrollToPrevBookmark = () => {
    if (bookmarks.length === 0) return;

    let newIndex = currentBookmarkIndex - 1;
    if (newIndex < 0) newIndex = bookmarks.length - 1;

    setCurrentBookmarkIndex(newIndex);
    scrollToBookmark(bookmarks[newIndex]);
    setShowBookmarkPopup(false);
  };

  const quill = getQuill(documentId);
  const updateLineNumbers = useCallback(() => {
    if (!lineNumbersRef.current) return;

    const editorElement = editorRef?.current?.querySelector(".ql-editor");
    if (!editorElement) return;

    const childs = editorElement.children;
    if (!childs.length) return;

    const newLineNumbers: Array<{
      number: number;
      top: number;
      height: number;
      lineHeight?: string;
    }> = [];

    let lineNumber = 1;
    const editorRect = editorElement.getBoundingClientRect();
    const editorScrollTop = editorElement.scrollTop;

    Array.from(childs).forEach((child) => {
      if (child.tagName !== "P" || !child.textContent?.trim()) return;

      const range = document.createRange();
      range.selectNodeContents(child);
      const rects = Array.from(range.getClientRects());
      if (rects.length === 0) return;

      const paraTop =
        rects[0].top - editorRect.top + editorScrollTop + offsetTop;
      const paraHeight = rects.reduce((sum, rect) => sum + rect.height, 0);

      newLineNumbers.push({
        number: lineNumber,
        top: paraTop,
        height: paraHeight,
      });
      lineNumber++;
    });

    if (lineNumbersRef.current) {
      lineNumbersRef.current.style.height = `${editorElement.scrollHeight}px`;
    }

    const totalLines = lineNumber - 1;
    const digitsRequired =
      totalLines > 0 ? Math.floor(Math.log10(totalLines)) + 1 : 1;
    startTransition(() => {
      setMaxLineWidth(Math.max(digitsRequired, 2));
      setLineNumbers(newLineNumbers);
    });
  }, [editorRef]);
  useEffect(() => {
    const debouncedUpdateLineNumbers = debounce(updateLineNumbers, 300);

    if (quill) {
      quill.on("text-change", debouncedUpdateLineNumbers);
      quill.root.addEventListener("resize", debouncedUpdateLineNumbers);
      const resizeObserver = new ResizeObserver(() => {
        debouncedUpdateLineNumbers();
      });
      resizeObserver.observe(quill.root);
      quill.root.addEventListener("scroll", debouncedUpdateLineNumbers);
      debouncedUpdateLineNumbers(); // Initial call
    }

    const editorContainer = editorRef?.current?.querySelector(".ql-editor");
    if (editorContainer) {
      const handleScroll = () => {
        if (lineNumbersRef.current) {
          lineNumbersRef.current.style.transform = `translateY(${-editorContainer.scrollTop}px)`;
        }
      };
      editorContainer.addEventListener("scroll", handleScroll);

      return () => {
        editorContainer.removeEventListener("scroll", handleScroll);
        quill?.off("text-change", debouncedUpdateLineNumbers);
        window.removeEventListener("resize", debouncedUpdateLineNumbers);
      };
    }

    return () => {
      quill?.off("text-change", debouncedUpdateLineNumbers);
      window.removeEventListener("resize", debouncedUpdateLineNumbers);
    };
  }, [quill, updateLineNumbers, editorRef]);

  useEffect(() => {
    if (bookmarks.length > 0 && currentBookmarkIndex >= 0) {
      setShowBookmarkPopup(
        !isBookmarkInViewport(bookmarks[currentBookmarkIndex])
      );
      const timer = setTimeout(() => {
        setShowBookmarkPopup(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [
    lineNumbers.length,
    bookmarks,
    currentBookmarkIndex,
    isBookmarkInViewport,
  ]);

  const isRoot = documentId === useParams().id;

  const handleClickOnLineNumber = (e: React.MouseEvent<HTMLSpanElement>) => {
    // Get the line number from the clicked element or its parent
    let lineNumber: string | null = null;
    const target = e.target as HTMLSpanElement;

    if (target.classList.contains("line-number")) {
      // Clicked on outer span
      const innerSpan = target.querySelector("span");
      lineNumber = innerSpan?.textContent || null;
    } else {
      // Clicked on inner span
      lineNumber = target.textContent;
    }

    if (!lineNumber) return;

    // Get current editor's container and clicked element's position
    const currentEditor = editorRef?.current?.querySelector(".ql-editor");
    const clickedSpan = target.closest(".line-number") as HTMLSpanElement;
    if (!clickedSpan) return;

    const clickedTop = parseFloat(clickedSpan.style.top);
    const currentScrollTop = currentEditor?.scrollTop || 0;
    const viewportOffset = clickedTop - currentScrollTop;

    // Get the other editor's line numbers container
    const otherClass = isRoot ? "quill-2" : "quill-1";
    const otherLineNumbers = document.querySelector(`.${otherClass}`);
    if (!otherLineNumbers) return;

    // Find matching line number span in other editor
    const targetSpan = Array.from(
      otherLineNumbers.getElementsByClassName("line-number")
    ).find((span) => span.querySelector("span")?.textContent === lineNumber);

    if (targetSpan) {
      // Get the other editor's container
      const otherEditor = otherLineNumbers
        .closest(".editor-container")
        ?.querySelector(".ql-editor");
      if (otherEditor) {
        // Calculate scroll position to maintain same relative position
        const targetTop = parseFloat((targetSpan as HTMLElement).style.top);
        otherEditor.scrollTop = targetTop - viewportOffset;
      }
    }
  };
  const isactive = activeEditor === documentId;

  return (
    <>
      {bookmarks.length > 0 &&
        isactive &&
        createPortal(
          <div className="z-10 flex items-center  gap-2">
            {t("common.bookmark")}
            {bookmarks.length > 1 && (
              <button
                onClick={handleScrollToPrevBookmark}
                title={t("common.previousBookmark")}
                className="rounded-l "
              >
                <FaChevronUp />
              </button>
            )}
            <button
              onClick={scrollToBookmark.bind(
                null,
                bookmarks[currentBookmarkIndex]
              )}
              title={t("common.goToCurrentBookmark")}
              className="  "
            >
              <FaBookmark />
            </button>
            {bookmarks.length > 0 && (
              <button
                onClick={handleScrollToNextBookmark}
                title={t("common.nextBookmark")}
                className=" rounded-r "
              >
                <FaChevronDown />
              </button>
            )}
          </div>,
          document.getElementById("bookmark-options")!
        )}

      <div
        ref={lineNumbersRef}
        className={`line-numbers mt-[3px] h-full ${
          isRoot ? "quill-1" : "quill-2"
        } text-right relative`}
        style={{ width: `${maxLineWidth + 2}ch` }}
      >
        {lineNumbers.map((lineNum) => (
          <span
            key={`${documentId}-line-${lineNum.number}`}
            onDoubleClick={() => handleDoubleClick(lineNum.number)}
            style={{
              top: `${lineNum.top}px`,
              height: `${lineNum.height}px`,
            }}
            onClick={handleClickOnLineNumber}
            className={`line-number relative flex w-full min-w-[3ch] items-center justify-start pl-1 transition-opacity duration-300`}
            id={`${documentId}-line-${lineNum.number}`}
          >
            <span
              className={
                bookmarks.includes(lineNum.number)
                  ? "bg-amber-100 font-medium text-amber-900 border-l-2 text-right w-full border-amber-500"
                  : "hover:bg-gray-100 text-right w-full dark:hover:bg-neutral-700"
              }
            >
              {lineNum.number}
            </span>
          </span>
        ))}
      </div>
    </>
  );
};

export default LineNumberVirtualized;
