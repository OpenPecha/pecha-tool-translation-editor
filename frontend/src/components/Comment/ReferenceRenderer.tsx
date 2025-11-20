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

  const toggleReference = (uniqueKey: string) => {
    setExpandedRefs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(uniqueKey)) {
        newSet.delete(uniqueKey);
      } else {
        newSet.add(uniqueKey);
      }
      return newSet;
    });
  };

  const getReference = (refName: string): CommentReference | undefined => {
    return references.find((ref) => ref.name === refName);
  };

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const segments = parseContent(content);

  return (
    <div className="whitespace-pre-wrap">
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.content}</span>;
        }

        return (
          <span key={index} className="inline">
            {segment.references?.map((refName, refIndex) => {
              const ref = getReference(refName);
              if (!ref) return null;

              // Create unique key for each reference instance
              const uniqueKey = `${index}-${refIndex}`;
              const isExpanded = expandedRefs.has(uniqueKey);
              const displayContent = isExpanded
                ? ref.content
                : truncateText(ref.content, 50);

              return (
                <span key={refIndex}>
                  {refIndex > 0 && <br />}
                  <button
                    type="button"
                    onClick={() => toggleReference(uniqueKey)}
                    className={`${
                      isExpanded
                        ? "bg-blue-100 hover:bg-blue-200"
                        : "bg-yellow-100 hover:bg-yellow-200"
                    } px-1 mt-1 rounded cursor-pointer transition-colors text-left`}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? "Collapse" : "Expand"} reference`}
                  >
                    <span className="text-left">
                      {displayContent}
                    </span>
                  </button>
                </span>
              );
            })}
          </span>
        );
      })}
    </div>
  );
};

