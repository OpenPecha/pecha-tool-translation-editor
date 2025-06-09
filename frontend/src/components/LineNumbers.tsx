import { useRef, useState, useEffect, useCallback, memo } from "react";
import { debounce } from "lodash";
import { useParams } from "react-router-dom";
import { useEditor } from "@/contexts/EditorContext";
import useLocalStorage from "@/hooks/useLocalStorage";
import { FaBookmark, FaChevronUp, FaChevronDown } from "react-icons/fa";
import { createPortal } from "react-dom";

const offsetTop = 0;

const LineNumberVirtualized = ({ editorRef, documentId }) => {
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [lineNumbers, setLineNumbers] = useState<
    Array<{
      number: number;
      top: number;
      height: number;
      lineHeight?: string;
    }>
  >([]);
  const [bookmarks, setBookmarks] = useLocalStorage<number[]>(
    `${documentId}-bookmarks`,
    []
  );
  const [currentBookmarkIndex, setCurrentBookmarkIndex] = useState<number>(-1);
  const [showBookmarkPopup, setShowBookmarkPopup] = useState(false);
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

  const isBookmarkInViewport = (lineNumber: number) => {
    const editorContainer = editorRef?.current?.querySelector(".ql-editor");
    const lineNumberSpan = lineNumbersRef.current?.querySelector(
      `.line-number[id$="-line-${lineNumber}"]`
    ) as HTMLElement;

    if (!editorContainer || !lineNumberSpan) return false;

    const containerRect = editorContainer.getBoundingClientRect();
    const lineTop = parseFloat(lineNumberSpan.style.top);
    const scrollTop = editorContainer.scrollTop;

    // Check if bookmark is within viewport
    return !(lineTop < scrollTop || lineTop > scrollTop + containerRect.height);
  };

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

  const { getQuill, activeEditor } = useEditor();
  const quill = getQuill(documentId);
  const updateLineNumbers = useCallback(() => {
    if (!lineNumbersRef.current) return;

    const editorElement = editorRef?.current?.querySelector(".ql-editor");
    if (!editorElement) return;

    // const paragraphs = editorElement.getElementsByTagName("p");
    const childs = editorElement.children;
    if (!childs.length) return;

    const newLineNumbers: Array<{
      number: number;
      top: number;
      height: number;
      lineHeight?: string;
    }> = [];

    let lineNumber = 1;
    let groupType: string | null = null;
    let groupTopOffset = 0;
    let groupHeight = 0;
    let isGrouping = false;

    const editorRect = editorElement.getBoundingClientRect();
    const editorScrollTop = editorElement.scrollTop;

    const flushGroup = () => {
      if (!isGrouping) return;

      newLineNumbers.push({
        number: lineNumber,
        top: groupTopOffset,
        height: groupHeight,
      });
      lineNumber++;

      groupType = null;
      groupTopOffset = 0;
      groupHeight = 0;
      isGrouping = false;
    };

    Array.from(childs).forEach((child, index) => {
      const trimmedText = child.textContent?.trim();
      if (!trimmedText) return;
      const currentType = child.getAttribute("data-type");

      const range = document.createRange();
      range.selectNodeContents(child);
      const rects = Array.from(range.getClientRects());
      if (rects.length === 0) return;

      const paraTop =
        rects[0].top - editorRect.top + editorScrollTop + offsetTop;
      const paraHeight = rects.reduce((sum, rect) => sum + rect.height, 0);

      if (currentType === groupType && currentType !== null) {
        groupHeight += paraHeight;
      } else {
        flushGroup();

        if (currentType) {
          groupType = currentType;
          groupTopOffset = paraTop;
          groupHeight = paraHeight;
          isGrouping = true;
        } else {
          newLineNumbers.push({
            number: lineNumber,
            top: paraTop,
            height: paraHeight,
            lineHeight: `${paraHeight}px`,
          });
          lineNumber++;
        }
      }
    });

    flushGroup();
    if (lineNumbersRef.current) {
      lineNumbersRef.current.style.height = `${editorElement.scrollHeight}px`;
    }

    // Calculate the width needed for the largest line number
    const totalLines = lineNumber - 1;
    const digitsRequired =
      totalLines > 0 ? Math.floor(Math.log10(totalLines)) + 1 : 1;
    setMaxLineWidth(Math.max(digitsRequired, 2)); // At least 2 characters wide

    setLineNumbers(newLineNumbers);
  }, [editorRef, quill]);

  useEffect(() => {
    const debouncedUpdateLineNumbers = debounce(() => {
      requestAnimationFrame(() => updateLineNumbers());
    }, 300);
    debouncedUpdateLineNumbers();
    if (!quill) return;

    const editorContainer = editorRef?.current?.querySelector(".ql-editor");
    if (editorContainer) {
      editorContainer.addEventListener("scroll", () => {
        if (lineNumbersRef.current) {
          lineNumbersRef.current.style.transform = `translateY(${-editorContainer.scrollTop}px)`;
        }
        debouncedUpdateLineNumbers();

        // Update bookmark popup visibility on scroll
        if (bookmarks.length > 0 && currentBookmarkIndex >= 0) {
          setShowBookmarkPopup(
            !isBookmarkInViewport(bookmarks[currentBookmarkIndex])
          );
        }
      });
      editorContainer.addEventListener("", () => {
        debouncedUpdateLineNumbers();

        // Update bookmark popup visibility on scroll
      });
    }

    quill.on("text-change", function (delta, oldDelta, source) {
      debouncedUpdateLineNumbers();
    });

    window.addEventListener("resize", debouncedUpdateLineNumbers);

    return () => {
      window.removeEventListener("resize", debouncedUpdateLineNumbers);
    };
  }, [editorRef, quill, updateLineNumbers, bookmarks, currentBookmarkIndex]);

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
  }, [lineNumbers.length, bookmarks, currentBookmarkIndex]);

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
            Bookmark
            {bookmarks.length > 1 && (
              <button
                onClick={handleScrollToPrevBookmark}
                title="Previous bookmark"
                className=" text-gray-500 rounded-l "
              >
                <FaChevronUp />
              </button>
            )}
            <button
              onClick={scrollToBookmark.bind(
                null,
                bookmarks[currentBookmarkIndex]
              )}
              title="Go to current bookmark"
              className=" text-gray-500  "
            >
              <FaBookmark />
            </button>
            {bookmarks.length > 0 && (
              <button
                onClick={handleScrollToNextBookmark}
                title="Next bookmark"
                className=" text-gray-500 rounded-r "
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
        style={{ width: `${maxLineWidth + 1}ch` }}
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
            className={`line-number relative flex w-full items-center justify-start pl-1`}
            id={`${documentId}-line-${lineNum.number}`}
          >
            <span
              className={
                bookmarks.includes(lineNum.number)
                  ? "bg-amber-100 font-medium text-amber-900 border-l-2 text-right w-full border-amber-500"
                  : "hover:bg-gray-100 text-right w-full"
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

export default memo(LineNumberVirtualized);
