import { useEffect, useRef } from "react";
import type Quill from "quill";
import type { Range } from "quill/core";
import { useSelectionStore, EditorId } from "@/stores/selectionStore";
interface UseQuillSelectionProps {
  quill: Quill | undefined;
  editorId: EditorId;
  onManualSelect: (editorId: EditorId, selection: Selection) => void;
  onLineFocus: () => void;
}

export function useQuillSelection({
  quill,
  editorId,
  onManualSelect,
  onLineFocus,
}: UseQuillSelectionProps) {
  const selection = useSelectionStore((state) => state.selections[editorId]);
  const isInternalUpdate = useRef(false);
  useEffect(() => {
    if (!quill) return;

    const handleSelectionChange = (
      range: Range,
      _oldRange: Range,
      source: string
    ) => {

      if (source !== "user" || isInternalUpdate.current) {
        if (isInternalUpdate.current) {
          isInternalUpdate.current = false;
        }
      }
      if (!range) return;
      if (range.length === 0){ 
        onLineFocus()
      }else {
      const text = quill.getText(range.index, range.length);
      onManualSelect(editorId, range, text);}
    };

    quill.on("selection-change", handleSelectionChange);

    return () => {
      quill.off("selection-change", handleSelectionChange);
    };
  }, [quill, onManualSelect, onLineFocus, editorId]);

  useEffect(() => {
    if (!quill) return;

    if (!selection) {
      if (quill.getSelection()) {
        isInternalUpdate.current = true;
        quill.setSelection(0, 0, "api");
      }
      return;
    }

    isInternalUpdate.current = true;
  }, [quill, selection]);
}
