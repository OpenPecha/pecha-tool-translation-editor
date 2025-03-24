import Quill from "quill";
import React, { useEffect, useRef, useState } from "react";

function useScrollHook(
  quill1Ref: React.RefObject<Quill>,
  quill2Ref: React.RefObject<Quill>,
  htmlTag: string
) {
  const ignoreScrollEvents = useRef(false);
  const lastClickY = useRef<number | null>(null);
  const [syncMode, setSyncMode] = useState<"scroll" | "click" | "none">("none");

  const getQuerySelector = (tag: string) => {
    if (tag === "b") return "strong";
    if (tag === "i") return "em";
    return tag;
  };

  useEffect(() => {
    if (!quill1Ref.current || !quill2Ref.current) return;

    const quill1 = quill1Ref.current;
    const quill2 = quill2Ref.current;

    const handleScroll = (source: Quill, target: Quill) => {
      if (syncMode !== "scroll" || ignoreScrollEvents.current) return;

      const sourceEditor = source.root;
      const targetEditor = target.root;

      const selector = getQuerySelector(htmlTag);
      console.log("selector", selector);
      const sourceBlocks = Array.from(sourceEditor.querySelectorAll(selector));
      const targetBlocks = Array.from(targetEditor.querySelectorAll(selector));

      if (sourceBlocks.length === 0 || targetBlocks.length === 0) return;

      const sourceRect = sourceEditor.getBoundingClientRect();
      const visibleSourceBlocks = sourceBlocks.filter((block) => {
        const rect = block.getBoundingClientRect();
        return rect.top >= sourceRect.top && rect.bottom <= sourceRect.bottom;
      });

      if (visibleSourceBlocks.length === 0) return;

      const middleBlock =
        visibleSourceBlocks[Math.floor(visibleSourceBlocks.length / 2)];
      const sourceIndex = sourceBlocks.indexOf(middleBlock);

      if (sourceIndex !== -1 && sourceIndex < targetBlocks.length) {
        const targetBlock = targetBlocks[sourceIndex];
        ignoreScrollEvents.current = true;
        targetBlock.scrollIntoView({ block: "center", behavior: "auto" });
        setTimeout(() => {
          ignoreScrollEvents.current = false;
        }, 50);
      }
    };

    const handleClick = (event: MouseEvent, source: Quill, target: Quill) => {
      if (syncMode !== "click") return;

      lastClickY.current = event.clientY;

      const sourceEditor = source.root;
      const targetEditor = target.root;

      if (!sourceEditor || !targetEditor) return;

      const selector = getQuerySelector(htmlTag);
      const sourceBlocks = Array.from(sourceEditor.querySelectorAll(selector));
      const targetBlocks = Array.from(targetEditor.querySelectorAll(selector));

      if (sourceBlocks.length === 0 || targetBlocks.length === 0) return;

      const clickedBlock = sourceBlocks.find((block) => {
        const rect = block.getBoundingClientRect();
        const mouseY = lastClickY.current;
        return mouseY >= rect.top && mouseY <= rect.bottom;
      });

      if (!clickedBlock) return;

      const sourceIndex = sourceBlocks.indexOf(clickedBlock);
      if (sourceIndex !== -1 && sourceIndex < targetBlocks.length) {
        const targetBlock = targetBlocks[sourceIndex];
        targetBlock.scrollIntoView({ block: "center", behavior: "smooth" });
      }

      // Calculate the block's position relative to viewport
      const sourceBlockTop = clickedBlock.getBoundingClientRect().top;
      const sourceEditorTop = sourceEditor.getBoundingClientRect().top;
      const sourceRelativePosition = sourceBlockTop - sourceEditorTop;

      // Find index of clicked block
      const currentBlockIndex = sourceBlocks.indexOf(clickedBlock);

      if (currentBlockIndex >= 0 && currentBlockIndex < targetBlocks.length) {
        const targetBlock = targetBlocks[currentBlockIndex] as HTMLElement;
        const overlay = document.createElement("div");
        overlay.style.position = "absolute";
        overlay.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
        overlay.style.pointerEvents = "none";
        overlay.style.transition = "opacity 0.3s ease";
        overlay.style.zIndex = "9999"; // Make sure it’s on top

        // Create the overlay div
        targetBlock.scrollIntoView({ behavior: "auto" });

        // Then adjust scrollTop to match source's relative position
        requestAnimationFrame(() => {
          const targetBlockTop = targetBlock.getBoundingClientRect().top;
          const targetEditorTop = targetEditor.getBoundingClientRect().top;
          const currentOffset = targetBlockTop - targetEditorTop;
          const adjustment = currentOffset - sourceRelativePosition;

          targetEditor.scrollTop += adjustment;

          // Wait for next frame after scrollTop adjustment
          requestAnimationFrame(() => {
            // Now that scrolling is done, get updated position
            const finalRect = targetBlock.getBoundingClientRect();
            const finalScrollTop =
              window.pageYOffset || document.documentElement.scrollTop;
            const finalScrollLeft =
              window.pageXOffset || document.documentElement.scrollLeft;

            // Set overlay position and style
            overlay.style.top = `${finalRect.top + finalScrollTop}px`;
            overlay.style.left = `${finalRect.left + finalScrollLeft}px`;
            overlay.style.width = `${finalRect.width}px`;
            overlay.style.height = `${finalRect.height}px`;
            overlay.style.padding = "20px";

            // Append overlay to body
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
        });
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
  }, [syncMode, htmlTag]);

  return { syncMode, setSyncMode };
}

export default useScrollHook;
