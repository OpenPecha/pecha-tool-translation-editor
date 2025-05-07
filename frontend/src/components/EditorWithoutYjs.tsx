import React, { forwardRef, useEffect, useLayoutEffect, useRef } from "react";
import Quill from "quill";
import { Delta } from "quill-delta";

interface EditorProps {
  readOnly?: boolean;
  defaultValue?: Delta;
  onTextChange?: (delta: Delta, oldContents: Delta, source: string) => void;
  onSelectionChange?: (
    range: Quill.RangeStatic | null,
    oldRange: Quill.RangeStatic | null,
    source: string
  ) => void;
}

// Editor is an uncontrolled React component
const Editor = forwardRef<Quill, EditorProps>(
  ({ readOnly, defaultValue, onTextChange, onSelectionChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const defaultValueRef = useRef<Delta | undefined>(defaultValue);
    const onTextChangeRef = useRef<typeof onTextChange>(onTextChange);
    const onSelectionChangeRef =
      useRef<typeof onSelectionChange>(onSelectionChange);

    useLayoutEffect(() => {
      onTextChangeRef.current = onTextChange;
      onSelectionChangeRef.current = onSelectionChange;
    });

    useEffect(() => {
      ref.current?.enable(!readOnly);
    }, [ref, readOnly]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const editorContainer = container.appendChild(
        container.ownerDocument.createElement("div")
      );
      const quill = new Quill(editorContainer, {
        theme: "snow",
      });

      if (typeof ref === "function") {
        ref(quill);
      } else if (ref) {
        ref.current = quill;
      }

      if (defaultValueRef.current) {
        quill.setContents(defaultValueRef.current);
      }

      quill.on(
        Quill.events.TEXT_CHANGE,
        (delta: Delta, oldContents: Delta, source: string) => {
          onTextChangeRef.current?.(delta, oldContents, source);
        }
      );

      quill.on(
        Quill.events.SELECTION_CHANGE,
        (
          range: Quill.RangeStatic | null,
          oldRange: Quill.RangeStatic | null,
          source: string
        ) => {
          onSelectionChangeRef.current?.(range, oldRange, source);
        }
      );

      return () => {
        if (typeof ref === "function") {
          ref(null);
        } else if (ref) {
          ref.current = null;
        }
        container.innerHTML = "";
      };
    }, [ref]);

    return <div ref={containerRef}></div>;
  }
);

Editor.displayName = "Editor";

export default Editor;
