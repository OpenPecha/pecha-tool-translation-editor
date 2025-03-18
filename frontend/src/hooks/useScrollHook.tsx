import Quill from 'quill';
import React, { useEffect, useRef, useState } from 'react'

function useScrollHook(quill1Ref: React.RefObject<Quill>, quill2Ref: React.RefObject<Quill>) {
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
    
          // Get all text blocks and calculate line height
          const sourceBlocks = sourceEditor.querySelectorAll(
            "p, h1, h2, h3, pre, li"
          );
          const targetBlocks = targetEditor.querySelectorAll(
            "p, h1, h2, h3, pre, li"
          );
    
          const computedStyle = window.getComputedStyle(sourceEditor);
          const lineHeight = parseInt(computedStyle.lineHeight || "20");
          const paddingTop = parseInt(computedStyle.paddingTop || "0");
    
          // Find the block and line at current scroll position
          let currentBlockIndex = 0;
          let accumulatedHeight = paddingTop;
    
          // Find which block contains the current scroll position
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
    
          // Calculate exact line position
          const currentBlock = sourceBlocks[currentBlockIndex] as HTMLElement;
          const blockOffset = Math.max(0, scrollTop - accumulatedHeight);
          const linesInBlock = Math.ceil(currentBlock.offsetHeight / lineHeight);
          const currentLine = Math.min(
            Math.floor(blockOffset / lineHeight),
            Math.max(0, linesInBlock - 1)
          );
    
          // Calculate target scroll position
          if (currentBlockIndex < targetBlocks.length) {
            let targetScrollTop = paddingTop;
    
            // Add heights of preceding blocks
            for (let i = 0; i < currentBlockIndex; i++) {
              const block = targetBlocks[i] as HTMLElement;
              targetScrollTop += block.offsetHeight;
            }
    
            // Calculate line position in target block
            const targetBlock = targetBlocks[currentBlockIndex] as HTMLElement;
            const targetBlockLines = Math.ceil(
              targetBlock.offsetHeight / lineHeight
            );
    
            if (targetBlockLines > 1 && linesInBlock > 1) {
              // Calculate relative line position
              const lineProgress = currentLine / (linesInBlock - 1);
              const targetLine = Math.round(lineProgress * (targetBlockLines - 1));
              targetScrollTop += targetLine * lineHeight;
            }
    
            // Scroll target smoothly
            targetEditor.scrollTo({
              top: targetScrollTop,
            });
          }
    
          setTimeout(() => {
            ignoreScrollEvents.current = false;
          }, 50);
        };
    
        const handleClick = (source: Quill, target: Quill) => {
          if (syncMode !== "click") return;
    
          const [range] = source.selection.getRange();
          if (range) {
            // scroll the target to the same position as the source
            target.setSelection(range.index, range.length);
            source.setSelection(range.index, range.length);
          }
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

export default useScrollHook
