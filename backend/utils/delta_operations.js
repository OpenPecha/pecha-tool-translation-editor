const Y = require("yjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Generate Markdown with footnotes from delta content
 * @param {Array} delta - The document content as a Delta array
 * @param {Array} footnotes - Array of footnote objects with position and content
 * @returns {string} - Markdown content with footnotes
 */
function generateMarkdownWithFootnotes(delta, footnotes) {
  if (!Array.isArray(delta)) return "";

  let markdown = "";
  let currentPosition = 0;
  let footnoteIndex = 0;

  const sortedFootnotes = [...footnotes].sort(
    (a, b) => a.position - b.position
  );

  for (const op of delta) {
    if (typeof op.insert === "string") {
      const result = processTextWithFootnotes(
        op.insert,
        sortedFootnotes,
        currentPosition,
        footnoteIndex
      );
      markdown += result.markdown;
      currentPosition = result.newPosition;
      footnoteIndex = result.newFootnoteIndex;
    }
  }

  return markdown + generateFootnoteDefinitions(sortedFootnotes);
}

function processTextWithFootnotes(
  text,
  sortedFootnotes,
  currentPosition,
  footnoteIndex
) {
  let markdown = "";
  let remainingText = text;
  let newPosition = currentPosition;
  let newFootnoteIndex = footnoteIndex;

  while (
    shouldInsertFootnote(
      sortedFootnotes,
      newFootnoteIndex,
      newPosition,
      remainingText
    )
  ) {
    const footnote = sortedFootnotes[newFootnoteIndex];
    const result = insertFootnoteInText(remainingText, footnote, newPosition);
    markdown += result.beforeFootnote + `[^${footnote.number}]`;
    remainingText = result.afterFootnote;
    newPosition = footnote.position;
    newFootnoteIndex++;
  }

  if (remainingText) {
    markdown += remainingText;
    newPosition += remainingText.length;
  }

  return { markdown, newPosition, newFootnoteIndex };
}

function shouldInsertFootnote(
  sortedFootnotes,
  footnoteIndex,
  currentPosition,
  text
) {
  return (
    footnoteIndex < sortedFootnotes.length &&
    currentPosition <= sortedFootnotes[footnoteIndex].position &&
    sortedFootnotes[footnoteIndex].position < currentPosition + text.length
  );
}

function insertFootnoteInText(text, footnote, currentPosition) {
  const relativePosition = footnote.position - currentPosition;
  const beforeFootnote = text.substring(0, relativePosition);
  const afterFootnote = text.substring(relativePosition);
  return { beforeFootnote, afterFootnote };
}

function generateFootnoteDefinitions(sortedFootnotes) {
  if (sortedFootnotes.length === 0) return "";

  let definitions = "\n\n";
  for (const footnote of sortedFootnotes) {
    definitions += `[^${footnote.number}]: ${footnote.content}\n\n`;
  }
  return definitions;
}

async function extractFootnotesFromDelta(delta) {
  if (!Array.isArray(delta)) return [];

  const footnotes = [];
  const footnoteMap = new Map();
  let currentPosition = 0;

  for (let i = 0; i < delta.length; i++) {
    const op = delta[i];

    if (typeof op.insert !== "string") continue;
    currentPosition += op.insert.length;

    const threadId = extractThreadId(op);
    if (!threadId || footnoteMap.has(threadId)) continue;

    const footnoteNumber = footnoteMap.size + 1;
    const actualContent = await getFootnoteContent(threadId);

    const footnote = {
      threadId,
      number: footnoteNumber,
      position: currentPosition - op.insert.length,
      content: actualContent || `Footnote ${footnoteNumber}`,
      order: footnoteNumber,
      operationIndex: i,
    };

    footnoteMap.set(threadId, footnote);
    footnotes.push(footnote);
  }

  return footnotes;
}

function extractThreadId(op) {
  const attr = op.attributes?.footnote;
  if (!attr) return null;
  if (typeof attr === "string") return attr;
  if (typeof attr === "object" && attr !== null) {
    return attr.id || attr.threadId || null;
  }
  return null;
}

async function getFootnoteContent(threadId) {
  try {
    const footnoteRecord = await prisma.footnote.findFirst({
      where: { threadId },
      select: {
        id: true,
        threadId: true,
        content: true,
        order: true,
        docId: true,
      },
    });

    return footnoteRecord?.content || null;
  } catch (err) {
    return null;
  }
}

/**
 * Get the content of a document
 * @param {string} docId - The document ID
 * @returns {Promise<Array|null>} - The document content as a Delta array or null
 */
async function getDocumentContent(docId) {
  try {
    const document = await prisma.doc.findUnique({
      where: { id: docId },
      select: {
        id: true,
        identifier: true,
        docs_prosemirror_delta: true,
        docs_y_doc_state: true,
      },
    });

    if (!document) return null;

    // Get content from ProseMirror delta or Y.js state
    let delta = null;
    if (document.docs_prosemirror_delta) {
      delta = document.docs_prosemirror_delta;
    } else if (document.docs_y_doc_state) {
      const ydoc = new Y.Doc({ gc: true });
      Y.applyUpdate(ydoc, document.docs_y_doc_state);
      delta = ydoc.getText(document.identifier).toDelta();
    }

    return delta;
  } catch (error) {
    console.error("Error getting document content:", error);
    return null;
  }
}

/**
 * Convert Delta format to plain text
 * @param {Array} delta - The Delta array
 * @returns {string} - Plain text content
 */
function deltaToPlainText(delta) {
  if (!Array.isArray(delta)) return "";

  let text = "";
  for (const op of delta) {
    if (typeof op.insert === "string") {
      text += op.insert;
    }
  }

  // Preserve original linebreaks, only normalize excessive whitespace
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n\n")
    .trim();
}

module.exports = {
  generateMarkdownWithFootnotes,
  extractFootnotesFromDelta,
  getDocumentContent,
  deltaToPlainText,
};
