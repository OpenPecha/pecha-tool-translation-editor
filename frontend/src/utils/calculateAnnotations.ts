export function calculateAnnotations(content: string): {
  annotations: Array<{ span: { start: number; end: number } }>;
  cleanedContent: string;
} {
  // Handle empty content
  if (!content) {
    return { annotations: [], cleanedContent: "" };
  }
  const lines = content.trimEnd().split("\n");
  const annotations: Array<{ span: { start: number; end: number } }> = [];
  let cleanedContent = "";
  let currentPosition = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLength = line.length;

    if (lineLength === 0) {
      // Empty line: zero-length span at current position
      annotations.push({
        span: {
          start: currentPosition,
          end: currentPosition,
        },
      });
      // Position doesn't advance for empty lines
    } else {
      // Non-empty line: span covers the text in cleaned content
      annotations.push({
        span: {
          start: currentPosition,
          end: currentPosition + lineLength,
        },
      });

      // Add line text to cleaned content (no newline)
      cleanedContent += line;

      // Advance position by line length
      currentPosition += lineLength;
    }
  }

  return { annotations, cleanedContent };
}
