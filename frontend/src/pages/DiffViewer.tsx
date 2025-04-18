import Quill from "quill";
import { useEffect, useRef } from "react";
import Delta from "quill-delta";

const DiffViewer = ({ diffDelta }: { diffDelta: [number, string][] }) => {
  const quillRef = useRef<Quill | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!containerRef.current) return;

    if (!quillRef.current) {
      quillRef.current = new Quill(containerRef.current, {
        theme: "snow",
        readOnly: true,
        modules: {
          toolbar: false,
        },
      });
    }

    if (diffDelta) {
      try {
        // Create a delta from the previous content
        const prevDelta = new Delta(diffDelta);
        // Compose the previous delta with the diff delta
        // Set content with the combined delta
        quillRef.current.setContents(prevDelta);
      } catch (error) {
        console.error("Error applying diff:", error);
      }
    }
  }, [diffDelta]);

  return <div ref={containerRef} className="font-monlam" />;
};

export default DiffViewer;
