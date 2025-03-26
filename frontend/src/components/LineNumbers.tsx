import { useRef, useState, useEffect, useCallback } from "react";
import { debounce } from "lodash";

const LineNumberVirtualized = ({ editorRef, quill }) => {
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const updateLineNumbers = useCallback(() => {
    if (!lineNumbersRef.current) return;

    const editorElement = editorRef?.current?.querySelector(".ql-editor");
    if (!editorElement) return;

    const paragraphs = editorElement.getElementsByTagName("p");
    if (!paragraphs.length) return;

    lineNumbersRef.current.innerHTML = "";

    let lineNumber = 1;
    let groupType: string | null = null;
    let groupTopOffset = 0;
    let groupHeight = 0;
    let isGrouping = false;

    const editorRect = editorElement.getBoundingClientRect();
    const editorScrollTop = editorElement.scrollTop; // Get scroll position of editor

    const flushGroup = () => {
      if (!isGrouping) return;

      const span = document.createElement("span");
      span.textContent = lineNumber.toString();
      span.classList.add("line-number");
      span.style.top = `${groupTopOffset}px`;
      span.style.height = `${groupHeight}px`;
      span.style.display = "flex";
      span.style.alignItems = "flex-start";
      span.style.justifyContent = "center";
      span.style.paddingTop = "0";
      span.style.lineHeight = "1";

      lineNumbersRef.current!.appendChild(span);
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

      const paraTop = rects[0].top - editorRect.top + editorScrollTop; // Adjust by scrollTop
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
          const span = document.createElement("span");
          span.textContent = lineNumber.toString();
          span.classList.add("line-number");
          span.style.top = `${paraTop}px`;
          span.style.height = `${paraHeight}px`;
          span.style.lineHeight = `${paraHeight}px`;

          lineNumbersRef.current!.appendChild(span);
          lineNumber++;
        }
      }
    });

    flushGroup();
    lineNumbersRef.current.style.height = `${editorElement.scrollHeight}px`;
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
        // Update line numbers on scroll
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

  return <div ref={lineNumbersRef} className="line-numbers mt-[5px]" />;
};

export default LineNumberVirtualized;
