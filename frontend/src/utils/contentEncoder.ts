export interface AnnotationRange {
  from: number;
  to: number;
  type: "bold" | "italic" | "underline" | string;
}

export interface EncodedContent {
  text: string;
  annotations: AnnotationRange[];
}

// Special markers for encoding annotations in text
const MARKERS = {
  bold: { start: "⟪B⟫", end: "⟪/B⟫" },
  italic: { start: "⟪I⟫", end: "⟪/I⟫" },
  underline: { start: "⟪U⟫", end: "⟪/U⟫" },
  h1: { start: "⟪H1⟫", end: "⟪/H1⟫" },
  h2: { start: "⟪H2⟫", end: "⟪/H2⟫" },
  h3: { start: "⟪H3⟫", end: "⟪/H3⟫" },
} as const;

/**
 * Encodes plain text with annotations into a marked-up text for CodeMirror
 * @param content - Plain text content
 * @param annotations - Array of annotation ranges
 * @returns Encoded text with inline markers
 */
export function encodeContentWithAnnotations(
  content: string,
  annotations: AnnotationRange[]
): string {
  if (!content || !annotations.length) {
    return content;
  }

  // Sort annotations by position (start position, then by end position in reverse)
  const sortedAnnotations = [...annotations].sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from;
    return b.to - a.to; // Longer ranges first when starting at same position
  });

  let result = content;

  // Process annotations from end to start to maintain positions
  for (let i = sortedAnnotations.length - 1; i >= 0; i--) {
    const annotation = sortedAnnotations[i];
    const marker = MARKERS[annotation.type as keyof typeof MARKERS];

    if (!marker) continue;

    // Ensure positions are valid
    if (
      annotation.from < 0 ||
      annotation.to > content.length ||
      annotation.from >= annotation.to
    ) {
      continue;
    }

    // Insert end marker first, then start marker
    result =
      result.slice(0, annotation.to) + marker.end + result.slice(annotation.to);
    result =
      result.slice(0, annotation.from) +
      marker.start +
      result.slice(annotation.from);
  }

  return result;
}

/**
 * Decodes marked-up text from CodeMirror back to plain text and annotations
 * @param encodedText - Text with inline markers
 * @returns Object containing plain text and annotations array
 */
export function decodeContentWithAnnotations(
  encodedText: string
): EncodedContent {
  if (!encodedText) {
    return { text: "", annotations: [] };
  }

  let text = encodedText;
  const annotations: AnnotationRange[] = [];

  // Process each marker type
  Object.entries(MARKERS).forEach(([type, marker]) => {
    const startMarker = marker.start;
    const endMarker = marker.end;

    let searchPos = 0;

    while (true) {
      const startIndex = text.indexOf(startMarker, searchPos);
      if (startIndex === -1) break;

      const endIndex = text.indexOf(endMarker, startIndex + startMarker.length);
      if (endIndex === -1) {
        // Remove orphaned start marker
        text =
          text.slice(0, startIndex) +
          text.slice(startIndex + startMarker.length);
        searchPos = startIndex;
        continue;
      }

      // Calculate positions in final text (without markers)
      const from = startIndex;
      const to = endIndex - startMarker.length;

      // Add annotation
      annotations.push({
        from,
        to,
        type,
      });

      // Remove markers from text
      text = text.slice(0, endIndex) + text.slice(endIndex + endMarker.length);
      text =
        text.slice(0, startIndex) + text.slice(startIndex + startMarker.length);

      searchPos = startIndex;
    }
  });

  // Sort annotations by position for consistency
  annotations.sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from;
    return a.to - b.to;
  });

  return { text, annotations };
}

/**
 * Converts legacy annotations to new format for encoding
 * @param content - Plain text content
 * @param legacyAnnotations - Annotations with absolute positions
 * @returns Encoded text ready for CodeMirror
 */
export function encodeLegacyContent(
  content: string,
  legacyAnnotations: AnnotationRange[]
): string {
  // Validate and filter annotations
  const validAnnotations = legacyAnnotations.filter(
    (annotation) =>
      annotation.from >= 0 &&
      annotation.to <= content.length &&
      annotation.from < annotation.to
  );

  return encodeContentWithAnnotations(content, validAnnotations);
}

/**
 * Utility function to check if text contains annotation markers
 * @param text - Text to check
 * @returns Boolean indicating if markers are present
 */
export function hasAnnotationMarkers(text: string): boolean {
  return Object.values(MARKERS).some(
    (marker) => text.includes(marker.start) || text.includes(marker.end)
  );
}

/**
 * Clean up any orphaned markers in text
 * @param text - Text to clean
 * @returns Cleaned text
 */
export function cleanOrphanedMarkers(text: string): string {
  let cleaned = text;

  Object.values(MARKERS).forEach((marker) => {
    // Remove any markers that don't have proper pairs
    cleaned = cleaned.replace(new RegExp(escapeRegExp(marker.start), "g"), "");
    cleaned = cleaned.replace(new RegExp(escapeRegExp(marker.end), "g"), "");
  });

  return cleaned;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
