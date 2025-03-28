import { useEffect, useRef, useCallback } from "react";
import Quill from "quill";
import { debounce } from "lodash";

interface UseScrollSyncProps {
  quill1: Quill | null;
  quill2: Quill | null;
  editorRef1: React.RefObject<HTMLDivElement>;
  editorRef2: React.RefObject<HTMLDivElement>;
  syncMode?: "scroll" | "click";
}

export function useScrollSync({
  quill1,
  quill2,
  editorRef1,
  editorRef2,
  syncMode = "scroll",
}: UseScrollSyncProps) {
  const ignoreScrollEvents = useRef(false);

  const findLineNumbersContainer = useCallback(
    (editorRef: React.RefObject<HTMLDivElement>) => {
      return editorRef.current
        ?.closest(".editor-container")
        ?.querySelector(".line-numbers") as HTMLElement;
    },
    []
  );

  const syncScroll = useCallback(
    (
      sourceEditor: HTMLElement,
      targetEditor: HTMLElement,
      sourceLineNumbers: HTMLElement,
      targetLineNumbers: HTMLElement
    ) => {
      if (ignoreScrollEvents.current) return;

      const scrollPercentage =
        sourceEditor.scrollTop /
        (sourceEditor.scrollHeight - sourceEditor.clientHeight);

      const targetScrollTop =
        (targetEditor.scrollHeight - targetEditor.clientHeight) *
        scrollPercentage;

      // Sync editor scroll
      targetEditor.scrollTop = targetScrollTop;

      // Sync line numbers
      targetLineNumbers.style.transform = `translateY(${-targetScrollTop}px)`;
    },
    []
  );

  useEffect(() => {
    if (!quill1 || !quill2) return;

    const sourceEditor1 = quill1.root;
    const sourceEditor2 = quill2.root;
    const lineNumbers1 = findLineNumbersContainer(editorRef1);
    const lineNumbers2 = findLineNumbersContainer(editorRef2);

    if (!sourceEditor1 || !sourceEditor2 || !lineNumbers1 || !lineNumbers2)
      return;

    const handleSourceScroll = debounce((event: Event) => {
      const target = event.target as HTMLElement;

      if (target === sourceEditor1) {
        syncScroll(sourceEditor1, sourceEditor2, lineNumbers1, lineNumbers2);
      } else if (target === sourceEditor2) {
        syncScroll(sourceEditor2, sourceEditor1, lineNumbers2, lineNumbers1);
      }
    }, 50);

    const enableScrollSync = () => {
      if (syncMode === "scroll") {
        sourceEditor1.addEventListener("scroll", handleSourceScroll);
        sourceEditor2.addEventListener("scroll", handleSourceScroll);
      }
    };

    const disableScrollSync = () => {
      sourceEditor1.removeEventListener("scroll", handleSourceScroll);
      sourceEditor2.removeEventListener("scroll", handleSourceScroll);
    };

    enableScrollSync();

    return () => {
      disableScrollSync();
    };
  }, [
    quill1,
    quill2,
    editorRef1,
    editorRef2,
    syncMode,
    syncScroll,
    findLineNumbersContainer,
  ]);

  const setSyncMode = useCallback((mode: "scroll" | "click") => {
    syncMode = mode;
  }, []);

  return {
    setSyncMode,
  };
}
