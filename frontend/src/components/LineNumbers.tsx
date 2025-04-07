import { useRef, useState, useEffect, useCallback } from "react";
import { debounce } from "lodash";
import { useParams } from "react-router-dom";
import { useEditor } from "@/contexts/EditorContext";
import useLocalStorage from "@/hooks/useLocalStorage";
import { FaBookmark } from "react-icons/fa";

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
  const [bookmarked, setBookmarked] = useLocalStorage(
    `${documentId}-bookmark`,
    0
  );
  const [showBookmarkPopup, setShowBookmarkPopup] = useState(false);
  const [maxLineWidth, setMaxLineWidth] = useState(3); // Default minimum width

  const handleDoubleClick = (lineNumber: number) => {
    if (lineNumber === bookmarked) {
      setBookmarked(0);
    } else {
      setBookmarked(lineNumber);
    }
  };

  const isBookmarkInViewport = () => {
    const editorContainer = editorRef?.current?.querySelector(".ql-editor");
    const lineNumberSpan = lineNumbersRef.current?.querySelector(
      `.line-number:nth-child(${bookmarked})`
    ) as HTMLElement;

    if (!editorContainer || !lineNumberSpan) return false;

    const containerRect = editorContainer.getBoundingClientRect();
    const lineTop = parseFloat(lineNumberSpan.style.top);
    const scrollTop = editorContainer.scrollTop;

    // Check if bookmark is within viewport
    return !(lineTop < scrollTop || lineTop > scrollTop + containerRect.height);
  };

  const handleScrollToBookmark = () => {
    const lineNumberSpan = lineNumbersRef.current?.querySelector(
      `.line-number:nth-child(${bookmarked})`
    ) as HTMLElement;

    if (lineNumberSpan) {
      const editorContainer = editorRef?.current?.querySelector(".ql-editor");
      if (editorContainer && lineNumberSpan) {
        const targetTop = parseFloat(lineNumberSpan.style.top);
        editorContainer.scrollTop = targetTop;
      }
    }
    setShowBookmarkPopup(false);
  };

  const { getQuill } = useEditor();
  const quill = getQuill(documentId);
  const updateLineNumbers = useCallback(() => {
    if (!lineNumbersRef.current) return;

    const editorElement = editorRef?.current?.querySelector(".ql-editor");
    if (!editorElement) return;

    const paragraphs = editorElement.getElementsByTagName("p");
    if (!paragraphs.length) return;

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

    Array.from(paragraphs).forEach((paragraph, index) => {
      const trimmedText = paragraph.textContent?.trim();
      if (!trimmedText) return;
      const currentType = paragraph.getAttribute("data-type");

      const range = document.createRange();
      range.selectNodeContents(paragraph);
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
    updateLineNumbers();
    if (!quill) return;

    const debouncedUpdateLineNumbers = debounce(() => {
      requestAnimationFrame(() => updateLineNumbers());
    }, 300);

    const editorContainer = editorRef?.current?.querySelector(".ql-editor");
    if (editorContainer) {
      editorContainer.addEventListener("scroll", () => {
        if (lineNumbersRef.current) {
          lineNumbersRef.current.style.transform = `translateY(${-editorContainer.scrollTop}px)`;
        }
        debouncedUpdateLineNumbers();

        // Update bookmark popup visibility on scroll
        if (bookmarked > 0) {
          setShowBookmarkPopup(!isBookmarkInViewport());
        }
      });
    }

    quill.on("text-change", function (delta, oldDelta, source) {
      debouncedUpdateLineNumbers();
    });

    window.addEventListener("resize", debouncedUpdateLineNumbers);

    return () => {
      window.removeEventListener("resize", debouncedUpdateLineNumbers);
    };
  }, [editorRef, quill, updateLineNumbers, bookmarked]);

  useEffect(() => {
    if (bookmarked > 0) {
      setShowBookmarkPopup(!isBookmarkInViewport());
      const timer = setTimeout(() => {
        setShowBookmarkPopup(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [lineNumbers.length]);

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

  return (
    <>
      {showBookmarkPopup && bookmarked > 0 && (
        <div className="fixed bottom-4 left-4  p-2 z-10  ">
          <button
            onClick={handleScrollToBookmark}
            title="Go to bookmark"
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          >
            <FaBookmark />
          </button>
        </div>
      )}
      <div
        ref={lineNumbersRef}
        className={`line-numbers mt-[3px] h-full ${
          isRoot ? "quill-1" : "quill-2"
        } text-right relative`}
        style={{ width: `${maxLineWidth + 1}ch` }}
      >
        {lineNumbers.map((lineNum, index) => (
          <EachLineNumber
            key={index}
            lineNumber={lineNum.number}
            position={lineNum}
            documentId={documentId}
            onCLick={handleClickOnLineNumber}
            handleDoubleClick={handleDoubleClick}
            bookmarked={bookmarked}
          />
        ))}
      </div>
    </>
  );
};

interface EachLineNumberProps {
  readonly lineNumber: number;
  readonly position: { readonly top: number; readonly height: number };
  readonly documentId: string;
  readonly onCLick: (e: React.MouseEvent<HTMLSpanElement>) => void;
  readonly handleDoubleClick: (lineNumber: number) => void;
  readonly bookmarked: number;
}

function EachLineNumber({
  lineNumber,
  position,
  documentId,
  onCLick,
  handleDoubleClick,
  bookmarked,
}: EachLineNumberProps) {
  const isBookmarked = bookmarked === lineNumber;
  return (
    <span
      onDoubleClick={() => handleDoubleClick(lineNumber)}
      style={{
        top: `${position.top}px`,
        height: `${position.height}px`,
      }}
      onClick={onCLick}
      className={`line-number relative flex w-full items-center justify-start pl-1`}
      id={`${documentId}-line-${lineNumber}`}
    >
      <span
        className={
          isBookmarked
            ? "bg-amber-100 font-medium text-amber-900 border-l-2 text-right w-full border-amber-500"
            : "hover:bg-gray-100 text-right w-full"
        }
      >
        {lineNumber}
      </span>
    </span>
  );
}

export default LineNumberVirtualized;
