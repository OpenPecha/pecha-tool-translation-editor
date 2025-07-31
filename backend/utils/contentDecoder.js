/**
 * Server-side content decoder for processing encoded content from frontend
 * This mirrors the frontend contentEncoder.ts functionality
 */

// Special markers for decoding annotations from text (must match frontend)
const MARKERS = {
  bold: { start: "⟪B⟫", end: "⟪/B⟫" },
  italic: { start: "⟪I⟫", end: "⟪/I⟫" },
  underline: { start: "⟪U⟫", end: "⟪/U⟫" },
  h1: { start: "⟪H1⟫", end: "⟪/H1⟫" },
  h2: { start: "⟪H2⟫", end: "⟪/H2⟫" },
  h3: { start: "⟪H3⟫", end: "⟪/H3⟫" },
};

/**
 * Decodes marked-up content from frontend back to plain text and annotations
 * @param {string} encodedContent - Content with inline annotation markers
 * @returns {Object} Object containing plain text and annotations array
 */
function decodeContentWithAnnotations(encodedContent) {
  if (!encodedContent) {
    return { text: "", annotations: [] };
  }

  let text = encodedContent;
  const annotations = [];

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
 * Encodes plain text with annotations into marked-up text
 * @param {string} content - Plain text content
 * @param {Array} annotations - Array of annotation objects
 * @returns {string} Encoded text with inline markers
 */
function encodeContentWithAnnotations(content, annotations) {
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
    const marker = MARKERS[annotation.type];

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
 * Utility function to check if content contains annotation markers
 * @param {string} content - Content to check
 * @returns {boolean} Boolean indicating if markers are present
 */
function hasAnnotationMarkers(content) {
  return Object.values(MARKERS).some(
    (marker) => content.includes(marker.start) || content.includes(marker.end)
  );
}

/**
 * Clean up any orphaned markers in content
 * @param {string} content - Content to clean
 * @returns {string} Cleaned content
 */
function cleanOrphanedMarkers(content) {
  let cleaned = content;

  Object.values(MARKERS).forEach((marker) => {
    // Remove any markers that don't have proper pairs
    cleaned = cleaned.replace(new RegExp(escapeRegExp(marker.start), "g"), "");
    cleaned = cleaned.replace(new RegExp(escapeRegExp(marker.end), "g"), "");
  });

  return cleaned;
}

/**
 * Process encoded content for database storage
 * Separates plain text and annotations for storage
 * @param {string} encodedContent - Encoded content from frontend
 * @returns {Object} Object with content and annotations for database
 */
function processEncodedContentForStorage(encodedContent) {
  const decoded = decodeContentWithAnnotations(encodedContent);

  return {
    content: decoded.text, // Plain text for database content field
    annotations: decoded.annotations, // Annotations array for separate storage
    encodedContent: encodedContent, // Original encoded content for backup/debugging
  };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  decodeContentWithAnnotations,
  encodeContentWithAnnotations,
  hasAnnotationMarkers,
  cleanOrphanedMarkers,
  processEncodedContentForStorage,
  MARKERS,
};
