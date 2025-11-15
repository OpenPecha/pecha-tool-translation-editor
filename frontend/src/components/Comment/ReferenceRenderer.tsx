import { useState } from "react";
import { CommentReference } from "@/stores/commentStore";

interface ReferenceRendererProps {
  content: string;
  references?: CommentReference[];
}

interface ContentSegment {
  type: "text" | "reference-group";
  content: string;
  references?: string[];
}

export const ReferenceRenderer = ({
  content,
  references = [],
}: ReferenceRendererProps) => {
  const [expandedRefs, setExpandedRefs] = useState<Set<string>>(new Set());

  // Parse content to find reference groups in [ref-name-1; ref-name-2] format
  const parseContent = (text: string): ContentSegment[] => {
    const segments: ContentSegment[] = [];
    const referencePattern = /\[([^\]]+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = referencePattern.exec(text)) !== null) {
      // Add text before the reference group
      if (match.index > lastIndex) {
        segments.push({
          type: "text",
          content: text.substring(lastIndex, match.index),
        });
      }

      // Extract individual reference names from the group
      const refNames = match[1]
        .split(";")
        .map((ref) => ref.trim())
        .filter((ref) => ref.length > 0);

      segments.push({
        type: "reference-group",
        content: match[0], // Keep the original [ref-name-1; ref-name-2] format
        references: refNames,
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after the last reference group
    if (lastIndex < text.length) {
      segments.push({
        type: "text",
        content: text.substring(lastIndex),
      });
    }

    // If no references found, return the whole content as text
    if (segments.length === 0) {
      segments.push({ type: "text", content: text });
    }

    return segments;
  };

  const toggleReference = (refName: string) => {
    setExpandedRefs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(refName)) {
        newSet.delete(refName);
      } else {
        newSet.add(refName);
      }
      return newSet;
    });
  };

  const getReference = (refName: string): CommentReference | undefined => {
    return references.find((ref) => ref.name === refName);
  };

  const segments = parseContent(content);

  return (
    <div className="whitespace-pre-wrap">
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.content}</span>;
        }

        // Render reference group
        return (
          <span key={index} className="inline-block align-top">
            <span className="inline">
              [
              {segment.references?.map((refName, refIndex) => {
                const isExpanded = expandedRefs.has(refName);
                const displayName = refName; // Display as ref-{type}-{count}

                return (
                  <span key={refIndex} className="inline">
                    <button
                      type="button"
                      onClick={() => toggleReference(refName)}
                      className={`${isExpanded ? "text-primary-300" : "underline"} cursor-pointer hover:opacity-70 transition-opacity text-inherit`}
                      aria-expanded={isExpanded}
                      aria-label={`Toggle reference ${displayName}`}
                    >
                      {displayName}
                    </button>
                    {refIndex < (segment.references?.length || 0) - 1 && (
                      <span className="mx-1">; </span>
                    )}
                  </span>
                );
              })}
              ]
            </span>
            {/* Render expanded references below, stacked vertically */}
            {segment.references && segment.references.some((refName) => expandedRefs.has(refName)) && (
              <div className="block w-full mt-2 space-y-2">
                {segment.references
                  .filter((refName) => expandedRefs.has(refName))
                  .map((refName) => {
                    const ref = getReference(refName);
                    if (!ref) return null;
                    return (
                      <div
                        key={refName}
                        className="border border-gray-300 rounded p-2 bg-gray-50 text-xs"
                      >
                        <div className="font-semibold mb-1 text-gray-700">
                          {ref.name}
                        </div>
                        <div className="text-gray-800 whitespace-pre-wrap">
                          {ref.content}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </span>
        );
      })}
    </div>
  );
};

