import { useRef, useState, useEffect, useCallback } from "react";
import { debounce } from "lodash";
import { useParams } from "react-router-dom";

const offsetTop = 0;

const LineNumberVirtualized = ({ editorRef, quill, documentId }) => {
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [lineNumbers, setLineNumbers] = useState<
    Array<{
      number: number;
      top: number;
      height: number;
      lineHeight?: string;
    }>
  >([]);

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
      });
    }

    quill.on("text-change", function (delta, oldDelta, source) {
      debouncedUpdateLineNumbers();
    });

    window.addEventListener("resize", debouncedUpdateLineNumbers);

    return () => {
      window.removeEventListener("resize", debouncedUpdateLineNumbers);
    };
  }, [editorRef, quill, updateLineNumbers]);

  const isRoot = documentId === useParams().id;

  const handleClickOnLineNumber = (e: React.MouseEvent<HTMLSpanElement>) => {
    const lineNumber = (e.target as HTMLSpanElement).textContent;
    if (!lineNumber) return;

    // Get current editor's container and clicked element's position
    const currentEditor = editorRef?.current?.querySelector(".ql-editor");
    const clickedSpan = e.target as HTMLSpanElement;
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
    ).find((span) => span.textContent === lineNumber);

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
    <div
      ref={lineNumbersRef}
      className={`line-numbers mt-[5px]  h-full ${
        isRoot ? "quill-1" : "quill-2"
      }`}
    >
      {lineNumbers.map((lineNum, index) => (
        <span
          key={index}
          className="line-number"
          style={{
            top: `${lineNum.top}px`,
            height: `${lineNum.height}px`,
          }}
          onClick={handleClickOnLineNumber}
        >
          {lineNum.number}
        </span>
      ))}
    </div>
  );
};

export default LineNumberVirtualized;
