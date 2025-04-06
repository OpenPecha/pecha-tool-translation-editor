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

      console.log(`${middleBlockTag} at index ${sourceTagIndex}`);

      // Only scroll if there's a matching tag at the same index in target
      if (sourceTagIndex !== -1 && sourceTagIndex < targetTagBlocks.length) {
        const targetBlock = targetTagBlocks[sourceTagIndex] as HTMLElement;
        console.log("Found matching target block", targetBlock);
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
      console.log("clientY", clientY);
      // Find the source and target editor containers
      const sourceContainer = sourceEditor.closest(".editor-container");
      const targetContainer = targetEditor.closest(".editor-container");

      // find line numbers containers
      let sourceLineNumbersContainer =
        sourceContainer?.querySelector(".line-numbers");
      let targetLineNumbersContainer =
        targetContainer?.querySelector(".line-numbers");
      console.log("sourceLineNumbersContainer", sourceLineNumbersContainer);
      console.log("targetLineNumbersContainer", targetLineNumbersContainer);

      if (!sourceContainer || !targetContainer) return;

      // Determine which editor is which (quill-1 or quill-2)
      const isSourceRoot =
        sourceContainer.classList.contains("quill-1") ||
        sourceLineNumbersContainer?.classList.contains("quill-1");
      console.log(
        "sourceLineNumbersContainer classlist",
        sourceLineNumbersContainer?.classList
      );
      console.log("isSourceRoot", isSourceRoot);

      // Find the line numbers containers based on quill class
      const sourceLineNumbersClass = isSourceRoot ? "quill-1" : "quill-2";
      const targetLineNumbersClass = isSourceRoot ? "quill-2" : "quill-1";

      console.log("Source line numbers class:", sourceLineNumbersClass);
      console.log("Target line numbers class:", targetLineNumbersClass);

      // Find the line numbers container for the source editor
      sourceLineNumbersContainer = document.querySelector(
        `.line-numbers.${sourceLineNumbersClass}`
      );

      // Find the line numbers container for the target editor
      targetLineNumbersContainer = document.querySelector(
        `.line-numbers.${targetLineNumbersClass}`
      );

      console.log("sourceLineNumbersContainer", sourceLineNumbersContainer);
      console.log("targetLineNumbersContainer", targetLineNumbersContainer);

      if (!sourceLineNumbersContainer || !targetLineNumbersContainer) {
        console.log("Could not find line numbers containers");
        return;
      }

      // Find the line number that corresponds to the clicked position
      const lineNumbers = Array.from(
        sourceLineNumbersContainer.querySelectorAll(".line-number")
      );

      // Find the line number element that contains the clicked position
      const clickedLineElement = lineNumbers.find((lineEl) => {
        const rect = lineEl.getBoundingClientRect();
        return clientY >= rect.top && clientY <= rect.bottom;
      });

      if (!clickedLineElement) {
        console.log("No line number element found at clicked position");
        return;
      }

      // Get the line number value
      const lineNumberSpan = clickedLineElement.querySelector("span");
      if (!lineNumberSpan) {
        console.log("No line number span found in clicked element");
        return;
      }
      console.log("lineNumberSpan", lineNumberSpan);

      const lineNumber = parseInt(lineNumberSpan.textContent ?? "0", 10);
      if (isNaN(lineNumber) || lineNumber <= 0) {
        console.log("Invalid line number:", lineNumberSpan.textContent);
        return;
      }

      console.log(`Clicked on line number: ${lineNumber}`);

      // Find the corresponding line number element in the target editor
      const targetLineElement = Array.from(
        targetLineNumbersContainer.querySelectorAll(".line-number")
      ).find((lineEl) => {
        const span = lineEl.querySelector("span");
        return span && parseInt(span.textContent ?? "0", 10) === lineNumber;
      }) as HTMLElement;

      if (!targetLineElement) {
        console.log(
          `No matching line number ${lineNumber} found in target editor`
        );
        return;
      }

      console.log("Found target line element:", targetLineElement);

      // Get the corresponding element in the target editor
      const targetTop = parseFloat(targetLineElement.style.top ?? "0");

      // Scroll the target editor to the corresponding position
      targetEditor.scrollTop = targetTop;

      // Find the actual element at this position to highlight
      const elementsAtPosition = Array.from(
        targetEditor.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, div")
      ).filter((el) => {
        const rect = el.getBoundingClientRect();
        const elTop = rect.top + window.scrollY;
        return (
          Math.abs(
            elTop - (targetTop + targetEditor.getBoundingClientRect().top)
          ) < 30
        );
      });

      console.log("Elements at target position:", elementsAtPosition.length);

      if (elementsAtPosition.length > 0) {
        createHighlightOverlay(elementsAtPosition[0] as HTMLElement);
      }
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
