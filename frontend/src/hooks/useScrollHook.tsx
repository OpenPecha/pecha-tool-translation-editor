import Quill from "quill";
import React, { useEffect, useRef, useState } from "react";

function useScrollHook(
  quill1Ref: React.RefObject<Quill>,
  quill2Ref: React.RefObject<Quill>
) {
  const ignoreScrollEvents = useRef(false);
  const [syncMode, setSyncMode] = useState<"scroll" | "click" | "none">("none");

  useEffect(() => {
    if (!quill1Ref.current || !quill2Ref.current) return;

    const handleScroll = (source: Quill, target: Quill) => {
      if (syncMode !== "scroll" || ignoreScrollEvents.current) return;

      ignoreScrollEvents.current = true;
      const sourceEditor = source.container.querySelector(
        ".ql-editor"
      ) as HTMLElement;
      const targetEditor = target.container.querySelector(
        ".ql-editor"
      ) as HTMLElement;

      if (!sourceEditor || !targetEditor) return;

      // Get current scroll position
      const scrollTop = sourceEditor.scrollTop;
      const paddingTop = parseInt(
        window.getComputedStyle(sourceEditor).paddingTop || "0"
      );

      // Get all blocks
      const sourceBlocks = Array.from(
        sourceEditor.querySelectorAll("p, h1, h2, h3, pre, li")
      );
      const targetBlocks = Array.from(
        targetEditor.querySelectorAll("p, h1, h2, h3, pre, li")
      );

      // Find which block contains the current scroll position
      let currentBlockIndex = 0;
      let accumulatedHeight = paddingTop;

      for (let i = 0; i < sourceBlocks.length; i++) {
        const block = sourceBlocks[i] as HTMLElement;
        const blockHeight = block.offsetHeight;

        if (accumulatedHeight + blockHeight > scrollTop) {
          currentBlockIndex = i;
          break;
        }
        accumulatedHeight += blockHeight;
      }

      // Handle case when scrolled past last block
      if (currentBlockIndex >= sourceBlocks.length) {
        currentBlockIndex = sourceBlocks.length - 1;
      }

      // Calculate the block's position relative to viewport
      const sourceBlock = sourceBlocks[currentBlockIndex] as HTMLElement;
      const sourceBlockTop = sourceBlock.getBoundingClientRect().top;
      const sourceEditorTop = sourceEditor.getBoundingClientRect().top;
      const sourceRelativePosition = sourceBlockTop - sourceEditorTop;

      // Scroll target to the corresponding block
      if (currentBlockIndex < targetBlocks.length) {
        const targetBlock = targetBlocks[currentBlockIndex] as HTMLElement;

        // First, scroll the block into view
        targetBlock.scrollIntoView({ behavior: "auto" });

        // Then adjust scrollTop to match source's relative position
        requestAnimationFrame(() => {
          const targetBlockTop = targetBlock.getBoundingClientRect().top;
          const targetEditorTop = targetEditor.getBoundingClientRect().top;
          const currentOffset = targetBlockTop - targetEditorTop;
          const adjustment = currentOffset - sourceRelativePosition;

          targetEditor.scrollTop += adjustment;
        });
      }

      setTimeout(() => {
        ignoreScrollEvents.current = false;
      }, 50);
    };

    const handleClick = (source: Quill, target: Quill) => {
      if (syncMode !== "click") return;

      // Get the clicked position from Quill's selection
      const [range] = source.selection.getRange();
      if (!range) return;

      // Find the block that contains the cursor position
      const [leaf] = source.getLeaf(range.index);
      if (!leaf?.domNode) return;

      const sourceEditor = source.container.querySelector(
        ".ql-editor"
      ) as HTMLElement;
      const targetEditor = target.container.querySelector(
        ".ql-editor"
      ) as HTMLElement;

      if (!sourceEditor || !targetEditor) return;

      // Prevent infinite loops from scroll events triggered by scrollIntoView
      if (ignoreScrollEvents.current) return;
      ignoreScrollEvents.current = true;

      // Get all blocks
      const sourceBlocks = Array.from(
        sourceEditor.querySelectorAll("p, h1, h2, h3, pre, li")
      );

      // Find the block containing the clicked position
      const clickedBlock = sourceBlocks.find((block) =>
        block.contains(leaf.domNode)
      );

      if (!clickedBlock) {
        ignoreScrollEvents.current = false;
        return;
      }

      // Calculate the block's position relative to viewport
      const sourceBlockTop = clickedBlock.getBoundingClientRect().top;
      const sourceEditorTop = sourceEditor.getBoundingClientRect().top;
      const sourceRelativePosition = sourceBlockTop - sourceEditorTop;

      // Find index of clicked block
      const currentBlockIndex = sourceBlocks.indexOf(clickedBlock);

      // Get target blocks and scroll to corresponding block
      const targetBlocks = Array.from(
        targetEditor.querySelectorAll("p, h1, h2, h3, pre, li")
      );

      if (currentBlockIndex >= 0 && currentBlockIndex < targetBlocks.length) {
        const targetBlock = targetBlocks[currentBlockIndex] as HTMLElement;

        // First, scroll the block into view
        targetBlock.scrollIntoView({ behavior: "auto" });

        // Then adjust scrollTop to match source's relative position
        requestAnimationFrame(() => {
          const targetBlockTop = targetBlock.getBoundingClientRect().top;
          const targetEditorTop = targetEditor.getBoundingClientRect().top;
          const currentOffset = targetBlockTop - targetEditorTop;
          const adjustment = currentOffset - sourceRelativePosition;

          targetEditor.scrollTop += adjustment;
        });
      }

      // Reset ignore flag after a short delay
      setTimeout(() => {
        ignoreScrollEvents.current = false;
      }, 50);
    };

    const scrollHandler1 = () =>
      handleScroll(quill1Ref.current!, quill2Ref.current!);
    const scrollHandler2 = () =>
      handleScroll(quill2Ref.current!, quill1Ref.current!);
    const clickHandler1 = () =>
      handleClick(quill1Ref.current!, quill2Ref.current!);
    const clickHandler2 = () =>
      handleClick(quill2Ref.current!, quill1Ref.current!);

    // Add event listeners
    quill1Ref.current.root.addEventListener("scroll", scrollHandler1);
    quill2Ref.current.root.addEventListener("scroll", scrollHandler2);
    quill1Ref.current.root.addEventListener("click", clickHandler1);
    quill2Ref.current.root.addEventListener("click", clickHandler2);

    // Cleanup
    return () => {
      quill1Ref.current?.root.removeEventListener("scroll", scrollHandler1);
      quill2Ref.current?.root.removeEventListener("scroll", scrollHandler2);
      quill1Ref.current?.root.removeEventListener("click", clickHandler1);
      quill2Ref.current?.root.removeEventListener("click", clickHandler2);
    };
  }, [syncMode]);

  return { syncMode, setSyncMode };
}

export default useScrollHook;
