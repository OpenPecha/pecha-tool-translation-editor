import Quill from "quill";
import { useEffect, useRef } from "react";
import Delta from "quill-delta";

const DiffViewer = ({ diffDelta, prev }: { diffDelta: any; prev: string }) => {
  const quillRef = useRef<Quill | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!containerRef.current) return;

    if (!quillRef.current) {
      const editor = document.createElement("div");
      editor.style.minHeight = "400px";

      quillRef.current = new Quill(editor, {
        theme: "snow",
        readOnly: true,
        modules: {
          toolbar: false,
        },
      });

      containerRef.current.appendChild(editor);
    }

    if (prev) {
      try {
        // Create a delta from the previous content
        const prevDelta = new Delta().insert(prev);
        // Compose the previous delta with the diff delta
        if (diffDelta) {
          const combinedDelta = prevDelta.compose(new Delta(diffDelta));
          // Set content with the combined delta
          quillRef.current.setContents(combinedDelta);
        } else {
          // If no diff, just set the previous content
          quillRef.current.setContents(prevDelta);
        }
      } catch (error) {
        console.error("Error applying diff:", error);
      }
    } else {
      const prevDelta = new Delta();
      if (diffDelta) {
        const combinedDelta = prevDelta.compose(new Delta(diffDelta));
        // Set content with the combined delta
        quillRef.current.setContents(combinedDelta);
      }
    }
  }, [diffDelta, prev]);

  return (
    <div
      id="diff-container"
      ref={containerRef}
      className="diff-viewer-container"
    />
  );
};

export default DiffViewer;
