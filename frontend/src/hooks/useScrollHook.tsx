import Quill from "quill";
import { useEffect, useRef, useState } from "react";

function useScrollHook(quill1: Quill, quill2: Quill) {
  const ignoreScrollEvents = useRef(false);
  const lastClickY = useRef<number | null>(null);
  const [syncMode, setSyncMode] = useState<"scroll" | "click" | "none">("none");
  const [syncType, setSyncType] = useState<"heading" | "lineNumber">("heading");

  useEffect(() => {
    if (!quill1 || !quill2) return;
    const allHeadersTags = ["h1", "h2", "h3", "h4", "h5", "h6"];

    const handleScroll = (source: Quill, target: Quill) => {
      if (syncMode !== "scroll" || ignoreScrollEvents.current) return;

      const sourceEditor = source.root;
      const targetEditor = target.root;

      const sourceBlocks = Array.from(
        sourceEditor.querySelectorAll(allHeadersTags.join(","))
      );
      const targetBlocks = Array.from(
        targetEditor.querySelectorAll(allHeadersTags.join(","))
      );

      if (sourceBlocks.length === 0 || targetBlocks.length === 0) return;

      const sourceRect = sourceEditor.getBoundingClientRect();
      const visibleSourceBlocks = sourceBlocks.filter((block) => {
        const rect = block.getBoundingClientRect();
        return rect.top >= sourceRect.top && rect.bottom <= sourceRect.bottom;
      });

      if (visibleSourceBlocks.length === 0) return;

      const middleBlock =
        visibleSourceBlocks[Math.floor(visibleSourceBlocks.length / 2)];

      // Get the tag name of the middle block (e.g., h1, h2, etc.)
      const middleBlockTag = middleBlock.tagName.toLowerCase();

      // Find all blocks with the same tag in source
      const sourceTagBlocks = sourceBlocks.filter(
        (block) => block.tagName.toLowerCase() === middleBlockTag
      );

      // Find the index of the middle block among blocks with the same tag
      const sourceTagIndex = sourceTagBlocks.indexOf(middleBlock);

      // Find all blocks with the same tag in target
      const targetTagBlocks = Array.from(
        targetEditor.querySelectorAll(middleBlockTag)
      );

      // Only scroll if there's a matching tag at the same index in target
      if (sourceTagIndex !== -1 && sourceTagIndex < targetTagBlocks.length) {
        const targetBlock = targetTagBlocks[sourceTagIndex] as HTMLElement;
        ignoreScrollEvents.current = true;
        targetBlock.scrollIntoView({ block: "center", behavior: "auto" });
        setTimeout(() => {
          ignoreScrollEvents.current = false;
        }, 50);
      } else {
        console.log(
          `No matching ${middleBlockTag} at index ${sourceTagIndex} in target`
        );
      }
    };

    // Helper function to create and position overlay
    const createHighlightOverlay = (targetElement: HTMLElement) => {
      const overlay = document.createElement("div");
      overlay.style.position = "absolute";
      overlay.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
      overlay.style.pointerEvents = "none";
      overlay.style.transition = "opacity 0.3s ease";
      overlay.style.zIndex = "9999";

      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });

      // Position the overlay
      requestAnimationFrame(() => {
        const finalRect = targetElement.getBoundingClientRect();
        const finalScrollTop = window.scrollY;
        const finalScrollLeft = window.scrollX;

        overlay.style.top = `${finalRect.top + finalScrollTop}px`;
        overlay.style.left = `${finalRect.left + finalScrollLeft}px`;
        overlay.style.width = `${finalRect.width}px`;
        overlay.style.height = `${finalRect.height}px`;

        document.body.appendChild(overlay);

        // Fade out and remove overlay
        setTimeout(() => {
          overlay.style.opacity = "0";
          setTimeout(() => {
            if (overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }
          }, 300);
        }, 2000);
      });
    };

    // Handle heading-based synchronization
    const handleHeadingSync = (
      sourceEditor: HTMLElement,
      targetEditor: HTMLElement,
      clientY: number
    ) => {
      // Get all heading elements in both editors
      const sourceBlocks = Array.from(
        sourceEditor.querySelectorAll(allHeadersTags.join(","))
      );

      if (sourceBlocks.length === 0) return;

      // Find the clicked heading element
      const clickedBlock = sourceBlocks.find((block) => {
        const rect = block.getBoundingClientRect();
        return clientY >= rect.top && clientY <= rect.bottom;
      });

      if (!clickedBlock) return;

      // Get the tag name of the clicked heading (e.g., h1, h2, etc.)
      const clickedTagName = clickedBlock.tagName.toLowerCase();

      // Find all headings with the same tag in source
      const sameTagSourceBlocks = sourceBlocks.filter(
        (block) => block.tagName.toLowerCase() === clickedTagName
      );

      // Find the index of the clicked heading among headings with the same tag
      const clickedHeadingIndex = sameTagSourceBlocks.indexOf(clickedBlock);

      if (clickedHeadingIndex === -1) return;

      // Find all headings with the same tag in target
      const sameTagTargetBlocks = Array.from(
        targetEditor.querySelectorAll(clickedTagName)
      );

      // Only scroll if there's a matching heading at the same index in target
      if (clickedHeadingIndex < sameTagTargetBlocks.length) {
        const targetBlock = sameTagTargetBlocks[
          clickedHeadingIndex
        ] as HTMLElement;
        createHighlightOverlay(targetBlock);
      } else {
        console.log(
          `No matching ${clickedTagName} at index ${clickedHeadingIndex} in target`
        );
      }
    };

    // Handle line number-based synchronization
    const handleLineNumberSync = (
      sourceEditor: HTMLElement,
      targetEditor: HTMLElement,
      clientY: number
    ) => {
      // Find the source and target editor containers
      const sourceContainer = sourceEditor.closest(".editor-container");
      const targetContainer = targetEditor.closest(".editor-container");

      // find line numbers containers
      let sourceLineNumbersContainer =
        sourceContainer?.querySelector(".line-numbers");
      const targetLineNumbersContainer =
        targetContainer?.querySelector(".line-numbers");

      if (!sourceContainer || !targetContainer) return;

      // Determine which editor is which (quill-1 or quill-2)
      const isSourceRoot =
        sourceContainer.classList.contains("quill-1") ||
        sourceEditor.classList.contains("quill-1") ||
        sourceLineNumbersContainer?.classList.contains("quill-1") ||
        sourceContainer.closest(".quill-1") !== null;

      // Find the line numbers containers based on quill class
      const sourceLineNumbersClass = isSourceRoot ? "quill-1" : "quill-2";

      // Find the line numbers container for the source editor
      sourceLineNumbersContainer = document.querySelector(
        `.line-numbers.${sourceLineNumbersClass}`
      );

      if (!sourceLineNumbersContainer) {
        console.log("Could not find source line numbers container");
        return;
      }

      // Find the element in the source editor that was clicked
      const sourceElements = Array.from(
        sourceEditor.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, div")
      );

      const clickedElement = sourceElements.find((el) => {
        const rect = el.getBoundingClientRect();
        return clientY >= rect.top && clientY <= rect.bottom;
      });

      if (!clickedElement) {
        console.log("No element found at clicked position");
        return;
      }

      // Get the position of the clicked element relative to the editor
      const clickedElementTop = clickedElement.getBoundingClientRect().top;
      const sourceEditorTop = sourceEditor.getBoundingClientRect().top;
      const editorScrollTop = sourceEditor.scrollTop;
      const relativePosition =
        clickedElementTop - sourceEditorTop + editorScrollTop;

      // Find the line number element that is closest to the clicked element's position
      const lineNumberElements = Array.from(
        sourceLineNumbersContainer.querySelectorAll(".line-number")
      );

      if (lineNumberElements.length === 0) {
        console.log("No line number elements found");
        return;
      }

      // Find the line number element with the closest top position to the clicked element
      let closestLineElement: HTMLElement | null = null;
      let minDistance = Number.MAX_VALUE;

      for (const lineEl of lineNumberElements) {
        const lineTop = parseFloat(lineEl.style.top || "0");
        const distance = Math.abs(lineTop - relativePosition);

        if (distance < minDistance) {
          minDistance = distance;
          closestLineElement = lineEl;
        }
      }

      if (!closestLineElement) {
        console.log("Could not find closest line element");
        return;
      }

      // go nested for a span element
      const spanElement = closestLineElement.querySelector("span");
      if (!spanElement) return;

      // Simulate a click on the line number to use the built-in synchronization
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      });

      spanElement.dispatchEvent(clickEvent);

      // The LineNumbers component's handleClickOnLineNumber will handle the synchronization
    };

    const handleClick = (event: MouseEvent, source: Quill, target: Quill) => {
      if (syncMode !== "click") return;

      lastClickY.current = event.clientY;

      const sourceEditor = source.root;
      const targetEditor = target.root;

      if (!sourceEditor || !targetEditor) return;

      if (syncType === "heading") {
        handleHeadingSync(sourceEditor, targetEditor, event.clientY);
      } else if (syncType === "lineNumber") {
        handleLineNumberSync(sourceEditor, targetEditor, event.clientY);
      }

      // Reset ignore flag after a short delay
      setTimeout(() => {
        ignoreScrollEvents.current = false;
      }, 50);
    };

    const scrollHandler1 = () => handleScroll(quill1, quill2);
    const scrollHandler2 = () => handleScroll(quill2, quill1);
    const clickHandler1 = (event: MouseEvent) =>
      handleClick(event, quill1, quill2);
    const clickHandler2 = (event: MouseEvent) =>
      handleClick(event, quill2, quill1);
    if (syncMode === "scroll") {
      quill1.root.addEventListener("scroll", scrollHandler1);
      quill2.root.addEventListener("scroll", scrollHandler2);
    } else if (syncMode === "click") {
      quill1.root.addEventListener("click", clickHandler1);
      quill2.root.addEventListener("click", clickHandler2);
    }

    return () => {
      quill1.root.removeEventListener("scroll", scrollHandler1);
      quill2.root.removeEventListener("scroll", scrollHandler2);
      quill1.root.removeEventListener("click", clickHandler1);
      quill2.root.removeEventListener("click", clickHandler2);
    };
  }, [syncMode, syncType, quill1, quill2]);

  return {
    syncMode,
    setSyncMode,
    syncType,
    setSyncType,
  };
}

export default useScrollHook;
