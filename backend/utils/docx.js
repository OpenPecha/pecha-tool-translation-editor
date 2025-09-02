const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  FootnoteReferenceRun,
  } = require("docx");
const PizZip = require("pizzip");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const path = require("path");
const Docxtemplater = require("docxtemplater");
const { TEMPLATE_MAP, TEMPLATE_PATH, MAX_CHAR_SOURCE_TRANSLATION_PAGE, MAX_CHAR_PER_TEMPLATE_PAGE } = require("./const");
const { deltaToPlainText } = require("./delta_operations");

const { exec } = require("child_process");
const { promisify } = require("util");
const { sendProgress, progressStreams } = require("./progress");
const execAsync = promisify(exec);

/**
 * Create a simple DOCX buffer from document content
 * @param {string} docName - The document name
 * @param {Array} delta - The document content as a Delta array
 * @returns {Promise<Buffer>} - The DOCX file as a buffer
 */
async function createDocxBuffer(docName, delta) {
  try {
    const docxElements = createDocumentHeader(docName);
    const footnotes = await extractFootnotesFromDelta(docName, delta);
    const contentElements = createContentElements(delta);
    const footnoteElements = createFootnoteElements(footnotes);

    docxElements.push(...contentElements, ...footnoteElements);

    return await createDocumentBuffer(docxElements);
  } catch (error) {
    console.error("Error creating DOCX buffer:", error);
    throw error;
  }
}

function createDocumentHeader(docName) {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: docName,
          bold: true,
          size: 32,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [new TextRun({ text: "" })] }),
  ];
}

function convertDeltaToDocx(deltaData) {
  const paragraphs = [];
  const footnotes = new Map();
  let currentParagraph = [];
  
  // First pass: collect footnote content
  deltaData.forEach(op => {
      if (op.attributes && op.attributes['footnote-row']) {
          const footnoteData = op.attributes['footnote-row'];
          footnotes.set(footnoteData.index, footnoteData.content);
      }
  });
  
  // Process each operation in the delta
  for (let index = 0; index < deltaData.length; index++) {
    const op = deltaData[index];
    
    // Break if footnote divider is encountered
    if (op.insert && typeof op.insert === 'object') {
        if (op.insert['footnote-divider']) {
            continue; // Break out of the loop
        }
        if (op.insert['footnote-number']) {
            // Add footnote reference
            const footnoteId = parseInt(op.insert['footnote-number'].index);
            currentParagraph.push(new FootnoteReferenceRun(footnoteId));
            continue;
        }
    }
    
    // Skip footnote row attributes
    if (op.attributes && op.attributes['footnote-row']) {
        continue;
    }
    
    if (typeof op.insert === 'string') {
        const text = op.insert;
        
        // Split by newlines to create separate paragraphs
        const lines = text.split('\n');
        
        lines.forEach((line, lineIndex) => {
            if (line.length > 0) {
                // Add text to current paragraph
                currentParagraph.push(new TextRun({
                    text: line
                }));
            }
            
            // If there's a newline (except for the last empty line), create a new paragraph
            if (lineIndex < lines.length - 1) {
                if (currentParagraph.length > 0) {
                    paragraphs.push(new Paragraph({
                        children: [...currentParagraph]
                    }));
                    currentParagraph = [];
                } else {
                    // Empty line, add empty paragraph
                    paragraphs.push(new Paragraph({}));
                }
            }
        });
    }
}
  
  // Add any remaining content as the last paragraph
  if (currentParagraph.length > 0) {
      paragraphs.push(new Paragraph({
          children: currentParagraph
      }));
  }
  
  // Create footnotes for the document
  const docFootnotes = {};
  footnotes.forEach((content, index) => {
      docFootnotes[index] = {
          children: [
              new Paragraph({
                  children: [
                      new TextRun(content)
                  ]
              })
          ]
      };
  });
  
  // Create the document
  const doc = new Document({
      sections: [{
          properties: {},
          children: paragraphs
      }],
      footnotes: footnotes.size > 0 ? docFootnotes : undefined
  });
  
  return doc;
}

async function generateDocxBuffer(deltaData) {
  try {
      console.log('Converting Delta data to DOCX...');
      
      const doc = convertDeltaToDocx(deltaData);
      
      // Generate buffer
      const buffer = await Packer.toBuffer(doc);
      
      return buffer;
      
  } catch (error) {
      console.error('❌ Error generating DOCX file:', error);
      throw error;
  }
}

async function extractFootnotesFromDelta(docName, delta) {
  const footnotes = [];
  const footnoteMap = new Map();
  let currentPosition = 0;

  for (let i = 0; i < delta.length; i++) {
    const op = delta[i];
    if (typeof op.insert !== "string") continue;

    const threadId = extractThreadId(op);
    if (!threadId || footnoteMap.has(threadId)) {
      currentPosition += op.insert.length;
      continue;
    }

    const footnote = await createFootnote(
      threadId,
      footnoteMap.size + 1,
      currentPosition,
      i
    );
    footnoteMap.set(threadId, footnote);
    footnotes.push(footnote);
    currentPosition += op.insert.length;
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

async function createFootnote(
  threadId,
  footnoteNumber,
  position,
  operationIndex
) {
  const actualContent = await getFootnoteContent(threadId);

  return {
    threadId,
    number: footnoteNumber,
    position,
    content: actualContent || `Footnote ${footnoteNumber}`,
    order: footnoteNumber,
    operationIndex,
  };
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
  } catch (error) {
    return null;
  }
}

function createContentElements(delta) {
  const text = deltaToPlainText(delta);
  const paragraphs = text.split(/\n+/).filter((p) => p.trim());

  return paragraphs.map(
    (paragraph) =>
      new Paragraph({
        children: [
          new TextRun({
            text: paragraph,
            size: 24,
          }),
        ],
      })
  );
}

function createFootnoteElements(footnotes) {
  if (footnotes.length === 0) return [];

  const elements = [
    new Paragraph({ children: [new TextRun({ text: "" })] }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Footnotes:",
          bold: true,
          size: 24,
        }),
      ],
    }),
  ];

  footnotes.forEach((footnote) => {
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${footnote.number}. `,
            bold: true,
            size: 20,
          }),
          new TextRun({
            text: footnote.content,
            size: 20,
          }),
        ],
      })
    );
  });

  return elements;
}

async function createDocumentBuffer(docxElements) {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docxElements,
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

/**
 * Create a side-by-side DOCX document with source and translation
 * @param {string} docName - The document name
 * @param {Array} sourceDelta - The source document content as a Delta array
 * @param {string} targetLanguage - The target language
 * @param {Array} translationDelta - The translation document content as a Delta array
 * @returns {Promise<Buffer>} - The DOCX file as a buffer
 */
async function createSideBySideDocx(
  docName,
  sourceDelta,
  targetLanguage,
  translationDelta
) {
  try {
    const docxElements = [];

    // Add document title
    docxElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${docName}`,
            bold: true,
            size: 32,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      })
    );

    // Add some spacing
    docxElements.push(new Paragraph({ children: [new TextRun({ text: "" })] }));

    // Convert deltas to plain text for easier processing
    const sourceText = deltaToPlainText(sourceDelta);
    const translationText = deltaToPlainText(translationDelta);

    // Split by paragraphs (double line breaks) or single line breaks for better granularity
    const sourceParagraphs = sourceText.split(/\n+/).filter((p) => p.trim());
    const translationParagraphs = translationText
      .split(/\n+/)
      .filter((p) => p.trim());

    // Create source-translation mapping for better alignment
    const sourceTranslationMapping = createSourceTranslationMapping(
      sourceParagraphs,
      translationParagraphs
    );

    const maxParagraphs = Math.max(
      sourceParagraphs.length,
      translationParagraphs.length
    );

    // Create table rows
    const tableRows = [];

    // Add header row
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Source",
                    bold: true,
                    color: "FFFFFF",
                    size: 24,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: {
              fill: "0066CC",
            },
            width: {
              size: 5000,
              type: WidthType.DXA,
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: targetLanguage,
                    bold: true,
                    color: "FFFFFF",
                    size: 24,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: {
              fill: "CC6600",
            },
            width: {
              size: 5000,
              type: WidthType.DXA,
            },
          }),
        ],
      })
    );

    // Add content rows
    for (let i = 0; i < maxParagraphs; i++) {
      const sourcePara = sourceParagraphs[i] || "";
      const translationPara = translationParagraphs[i] || "";

      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: sourcePara || " ",
                    }),
                  ],
                  spacing: {
                    before: 300, // 3 points spacing before
                    after: 300, // 3 points spacing after
                  },
                  indent: {
                    left: 150,
                    right: 150,
                  },
                }),
              ],
              width: {
                size: 5000,
                type: WidthType.DXA,
              },
            }),

            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: translationPara || " ",
                    }),
                  ],
                  spacing: {
                    before: 300, // 3 points spacing before
                    after: 300, // 3 points spacing after
                  },
                  indent: {
                    left: 100,
                    right: 100,
                  },
                }),
              ],
              width: {
                size: 5000,
                type: WidthType.DXA,
              },
            }),
          ],
        })
      );
    }

    // Create the table
    const table = new Table({
      rows: tableRows,
      width: {
        size: 10000,
        type: WidthType.DXA,
      },
      layout: "fixed",
      columnWidths: [5000, 5000], // Equal widths in DXA units (twentieths of a point)
      borders: {
        top: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        bottom: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        left: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        right: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "CCCCCC",
        },
        insideVertical: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "CCCCCC",
        },
      },
    });

    docxElements.push(table);

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docxElements,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  } catch (error) {
    console.error("Error creating side-by-side DOCX:", error);
    throw error;
  }
}

/**
 * Create a line-by-line DOCX document with source and translation
 * @param {string} docName - The document name
 * @param {Array} sourceDelta - The source document content as a Delta array
 * @param {string} targetLanguage - The target language
 * @param {Array} translationDelta - The translation document content as a Delta array
 * @returns {Promise<Buffer>} - The DOCX file as a buffer
 */
async function createLineByLineDocx(
  docName,
  sourceDelta,
  targetLanguage,
  translationDelta
) {
  try {
    const docxParagraphs = [];

    // Add document title
    docxParagraphs.push(
      new Paragraph({
        children: [
          // new TextRun({
          //   text: `${docName} - Line by Line Comparison`,
          //   bold: true,
          //   size: 32,
          // }),
        ],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      })
    );

    // Convert deltas to plain text
    const sourceText = deltaToPlainText(sourceDelta);
    const translationText = deltaToPlainText(translationDelta);

    // Split by lines
    const sourceLines = sourceText
      .split("\n")
      .filter((line) => line.trim() !== "");
    const translationLines = translationText
      .split("\n")
      .filter((line) => line.trim() !== "");

    const maxLines = Math.max(sourceLines.length, translationLines.length);

    for (let i = 0; i < maxLines; i++) {
      const sourceLine = sourceLines[i] || "";
      const translationLine = translationLines[i] || "";

      // Add source line
      if (sourceLine) {
        docxParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: sourceLine,
                size: 28,
              }),
            ],
          })
        );
        docxParagraphs.push(
          new Paragraph({ children: [new TextRun({ text: "" })] })
        );
      }

      // Add translation line (on separate line with lighter color)
      if (translationLine) {
        docxParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `    `, // Indentation for translation
              }),
              new TextRun({
                text: translationLine,
                color: "999999", // Lighter gray color (lower opacity effect)
                italics: true, // Make it italic to further distinguish
              }),
            ],
          })
        );
      }
      // Add spacing between line pairs
      if (i < maxLines - 1 && (sourceLine || translationLine)) {
        docxParagraphs.push(
          new Paragraph({ children: [new TextRun({ text: "" })] })
        );
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docxParagraphs,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  } catch (error) {
    console.error("Error creating line-by-line DOCX:", error);
    throw error;
  }
}


/**
 * Create a mapping between source and translation paragraphs for better alignment
 * @param {Array} sourceParagraphs - Array of source paragraphs
 * @param {Array} translationParagraphs - Array of translation paragraphs
 * @returns {Array} - Array of mapped objects with source, translation, and metadata
 */
function createSourceTranslationMapping(
  sourceParagraphs,
  translationParagraphs
) {
  const mapping = [];
  const maxLength = Math.max(
    sourceParagraphs.length,
    translationParagraphs.length
  );

  for (let i = 0; i < maxLength; i++) {
    const sourcePara = sourceParagraphs[i] || "";
    const translationPara = translationParagraphs[i] || "";

    // Skip if both source and translation are empty
    if (sourcePara.trim() === "" && translationPara.trim() === "") {
      continue;
    }

    const mappingEntry = {
      index: i,
      source: sourcePara,
      translation: translationPara,
      sourceLength: sourcePara.length,
      translationLength: translationPara.length,
      hasSource: sourcePara.trim() !== "",
      hasTranslation: translationPara.trim() !== "",
      isComplete: sourcePara.trim() !== "" && translationPara.trim() !== "",
      ratio:
        sourcePara.length > 0 ? translationPara.length / sourcePara.length : 0,
      // Metadata for processing
      needsAlignment: sourcePara.trim() !== "" && translationPara.trim() === "",
      isPartial:
        (sourcePara.trim() !== "" && translationPara.trim() === "") ||
        (sourcePara.trim() === "" && translationPara.trim() !== ""),
    };

    mapping.push(mappingEntry);
  }

  return mapping;
}


/**
 * Create paginated mapping where each page's combined content doesn't exceed MAX_CHAR_SOURCE_TRANSLATION_PAGE
 * @param {Array} sourceTranslationMapping - The original source-translation mapping
 * @param {number} maxCharsPerPage - Maximum characters per page (default: MAX_CHAR_SOURCE_TRANSLATION_PAGE)
 * @returns {Array} - Array of paginated objects with source, translation, and page metadata
 */
function createPaginatedMapping(
  sourceTranslationMapping,
  maxCharsPerPage = MAX_CHAR_SOURCE_TRANSLATION_PAGE
) {
  const paginatedPages = [];
  let currentPage = {
    source: "",
    translation: "",
    totalChars: 0,
    sourceParagraphs: [],
    translationParagraphs: [],
    pageNumber: 1,
    isComplete: true,
    needsAlignment: false,
    isPartial: false,
  };

  for (const mapping of sourceTranslationMapping) {
    const combinedLength = mapping.sourceLength + mapping.translationLength;

    // Check if adding this mapping would exceed the character limit
    if (
      currentPage.totalChars + combinedLength > maxCharsPerPage &&
      currentPage.totalChars > 0
    ) {
      // Current page is full, save it and start a new page
      paginatedPages.push({
        ...currentPage,
        source: currentPage.sourceParagraphs.join(" "), // No inline newlines
        translation: currentPage.translationParagraphs.join(" "), // No inline newlines
      });

      // Start new page
      currentPage = {
        source: "",
        translation: "",
        totalChars: 0,
        sourceParagraphs: [],
        translationParagraphs: [],
        pageNumber: currentPage.pageNumber + 1,
        isComplete: true,
        needsAlignment: false,
        isPartial: false,
      };
    }

    // Add mapping to current page
    currentPage.sourceParagraphs.push(mapping.source);
    currentPage.translationParagraphs.push(mapping.translation);
    currentPage.totalChars += combinedLength;

    // Update page metadata
    currentPage.isComplete = currentPage.isComplete && mapping.isComplete;
    currentPage.needsAlignment =
      currentPage.needsAlignment || mapping.needsAlignment;
    currentPage.isPartial = currentPage.isPartial || mapping.isPartial;
  }

  // Add the last page if it has content
  if (currentPage.totalChars > 0) {
    paginatedPages.push({
      ...currentPage,
      source: currentPage.sourceParagraphs.join(" "), // No inline newlines
      translation: currentPage.translationParagraphs.join(" "), // No inline newlines
    });
  }

  return paginatedPages;
}

/**
 * Create a side-by-side style DOCX template from source and translation content
 * @param {string} docName - The document name
 * @param {Array} sourceDelta - The source document content as a Delta array
 * @param {string} targetLanguage - The target language
 * @param {Array} translationDelta - The translation document content as a Delta array
 * @param {string} progressId - Progress tracking ID
 * @returns {Promise<Buffer>} - The DOCX file as a buffer
 */
async function createSideBySideDocxTemplate(
  docName,
  sourceDelta,
  targetLanguage,
  translationDelta,
  progressId
) {
  try {
    sendProgress(
      progressStreams,
      progressId,
      20,
      `Creating template for ${docName} - ${targetLanguage}...`
    );
    // Convert deltas to plain text
    const sourceText = deltaToPlainText(sourceDelta);
    const translationText = deltaToPlainText(translationDelta);

    // Split by paragraphs (double line breaks) or single line breaks for better granularity
    const sourceParagraphs = sourceText.split(/\n+/).filter((p) => p.trim());
    const translationParagraphs = translationText
      .split(/\n+/)
      .filter((p) => p.trim());

    // Create source-translation mapping for better alignment
    const sourceTranslationMapping = createSourceTranslationMapping(
      sourceParagraphs,
      translationParagraphs
    );

    // Create paginated mapping to control content per page
    const paginatedMapping = createPaginatedMapping(
      sourceTranslationMapping,
      MAX_CHAR_SOURCE_TRANSLATION_PAGE
    );


    // Create pages array with source/translation pairs (clean format)
    const pages = [];
    paginatedMapping.forEach((page, i) => {
      const pageBreak = i >= 0 ? '<w:br w:type="page"/>' : "";
      const pageNumber = page.pageNumber;
      pages.push({
        source: page.source,
        translation: page.translation,
        isLast: i === paginatedMapping.length - 1,
        pageBreak,
        needsPageBreak: i > 0,
        tibetanPageMarker: pageNumber % 2 === 1 ? "༄༅། །" : "",
        isOddPage: pageNumber % 2 === 1,
        // Additional metadata from paginated mapping
        pageNumber: page.pageNumber,
        totalChars: page.totalChars,
        sourceParagraphs: page.sourceParagraphs,
        translationParagraphs: page.translationParagraphs,
        isComplete: page.isComplete,
        needsAlignment: page.needsAlignment,
        isPartial: page.isPartial,
        charCount: page.totalChars,
        isWithinLimit: page.totalChars <= MAX_CHAR_SOURCE_TRANSLATION_PAGE,
      });
    });
    // Check if template exists
    const templatePath = TEMPLATE_MAP[`bo_${targetLanguage}`] || TEMPLATE_PATH;
    console.log("templatePath :: ", templatePath)
    if (!fs.existsSync(templatePath)) {
      console.warn(
        `Template not found at ${templatePath}, using fallback DOCX`
      );
      return createFallbackSideBySideDocxTemplate(pages);
    }

    sendProgress(progressStreams, progressId, 50, "Processing template...");

    // Read the template file
    const templateContent = fs.readFileSync(templatePath);

    // Use docxtemplater to populate the template
    const zip = new PizZip(templateContent);

    let doc;
    try {
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => "",
      });
    } catch (templateError) {
      console.error("Template parsing error:", templateError);

      return createFallbackSideBySideDocxTemplate(pages);
    }

    const templateData = {
      docName: docName || "Untitled Document",
      targetLanguage: targetLanguage,
      totalPages: pages.length,
      pages: pages,
      paginationInfo: {
        maxCharsPerPage: MAX_CHAR_SOURCE_TRANSLATION_PAGE,
        totalOriginalParagraphs: sourceTranslationMapping.length,
        totalPaginatedPages: paginatedMapping.length,
        averageCharsPerPage:
          pages.length > 0
            ? pages.reduce((sum, page) => sum + page.totalChars, 0) /
              pages.length
            : 0
      },
    };
    sendProgress(progressStreams, progressId, 70, "Rendering template...");

    try {
      doc.render(templateData);
    } catch (renderError) {
      console.error("Template rendering error:", renderError);
      return createFallbackSideBySideDocxTemplate(pages);
    }

    sendProgress(
      progressStreams,
      progressId,
      85,
      "Generating final document..."
    );

    // Get the generated document buffer
    const docBuffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    return docBuffer;
  } catch (error) {
    console.error("Error creating side-by-side DOCX template:", error);
    // Fallback to simple structure
    const pages = [
      {
        source: "Error",
        translation: error.message,
      },
    ];
    return createFallbackSideBySideDocxTemplate(pages);
  }
}

/**
 * Create paginated pages for single text content.
 * Groups paragraphs into pages until MAX_CHAR_PER_TEMPLATE_PAGE is reached.
 *
 * @param {string[]} paragraphs - Array of text paragraphs
 * @param {number} maxCharsPerPage - Maximum characters per page
 * @returns {Array} - Paginated page objects
 */
function createPagination(
  paragraphs,
  maxCharsPerPage = MAX_CHAR_PER_TEMPLATE_PAGE
) {
  const paginatedPages = [];
  let currentPage = {
    sourceParagraphs: [],
    totalChars: 0,
    pageNumber: 1,
  };

  for (const para of paragraphs) {
    const paraLength = para.length;

    // If adding this paragraph would exceed the limit, finalize current page
    if (
      currentPage.totalChars + paraLength > maxCharsPerPage &&
      currentPage.totalChars > 0
    ) {
      paginatedPages.push({
        source: currentPage.sourceParagraphs.join(" "),
        pageNumber: currentPage.pageNumber,
        totalChars: currentPage.totalChars,
        sourceParagraphs: [...currentPage.sourceParagraphs],
      });

      // Start a new page
      currentPage = {
        sourceParagraphs: [],
        totalChars: 0,
        pageNumber: currentPage.pageNumber + 1,
      };
    }

    // Add paragraph to current page
    currentPage.sourceParagraphs.push(para);
    currentPage.totalChars += paraLength;
  }

  // Push the last page if not empty
  if (currentPage.totalChars > 0) {
    paginatedPages.push({
      source: currentPage.sourceParagraphs.join(" "),
      pageNumber: currentPage.pageNumber,
      totalChars: currentPage.totalChars,
      sourceParagraphs: [...currentPage.sourceParagraphs],
    });
  }

  return paginatedPages;
}

/**
 * Create a source-only DOCX template with pagination
 * @param {string} docName - The document name
 * @param {Array} sourceDelta - The source document content as a Delta array
 * @param {string} progressId - Progress tracking ID
 * @returns {Promise<Buffer>} - The DOCX file as a buffer
 */
async function createDocxTemplate(docName, language, sourceDelta, progressId) {
  try {
    sendProgress(
      progressStreams,
      progressId,
      20,
      `Creating source-only template for ${docName}...`
    );

    // Convert delta to plain text
    const sourceText = deltaToPlainText(sourceDelta);
    // Split by paragraphs
    const sourceParagraphs = sourceText.split(/\n+/).filter((p) => p.trim());

    // Paginate source text
    const paginatedPages = createPagination(sourceParagraphs, MAX_CHAR_PER_TEMPLATE_PAGE);
    // Convert to pages array for template
    const pages = paginatedPages.map((page, i) => {
      const pageBreak = i >= 0 ? '<w:br w:type="page"/>' : "";
      const pageNumber = page.pageNumber;
      return {
        source: page.source,
        translation: "", // always empty
        isLast: i === paginatedPages.length - 1,
        pageBreak,
        needsPageBreak: i > 0 && i < paginatedPages.length - 1,
        tibetanPageMarker: pageNumber % 2 === 1 ? "༄༅། །" : "",
        isOddPage: pageNumber % 2 === 1,
        // Metadata
        pageNumber: page.pageNumber,
        totalChars: page.totalChars,
        sourceParagraphs: page.sourceParagraphs,
      };
    });
    // Check if template exists
    const templatePath = TEMPLATE_MAP[language] || TEMPLATE_PATH;
    if (!fs.existsSync(templatePath)) {
      console.warn(
        `Template not found at ${templatePath}, using fallback DOCX`
      );
      return createFallbackSideBySideDocxTemplate(pages);
    }

    sendProgress(progressStreams, progressId, 50, "Processing template...");

    // Read the template file
    const templateContent = fs.readFileSync(templatePath);

    const zip = new PizZip(templateContent);
    let doc;
    try {
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => "", // Return empty string for null values
      });
    } catch (templateError) {
      console.error("Template parsing error:", templateError);
      return createFallbackSideBySideDocxTemplate(pages);
    }

    const templateData = {
      docName: docName || "Untitled Document",
      targetLanguage: "Source Only",
      totalPages: pages.length,
      pages: pages,
      paginationInfo: {
        maxCharsPerPage: MAX_CHAR_PER_TEMPLATE_PAGE,
        totalOriginalParagraphs: sourceParagraphs.length,
        totalPaginatedPages: paginatedPages.length,
      },
    };

    sendProgress(progressStreams, progressId, 70, "Rendering template...");
    // console.log("template data ",templateData)
    // console.log("template content ",templateContent)
    try {
      doc.render(templateData);
    } catch (renderError) {
      console.error("Template rendering error:", renderError);
      return createFallbackSideBySideDocxTemplate(pages);
    }

    sendProgress(
      progressStreams,
      progressId,
      85,
      "Generating final document..."
    );

    const docBuffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    return docBuffer;
  } catch (error) {
    console.error("Error creating source-only DOCX template:", error);
    const pages = [{ source: "Error", translation: "" }];
    return createFallbackSideBySideDocxTemplate(pages);
  }
}

/**
 * Create a page view DOCX buffer from document content (simple page-based format)
 * @param {string} docName - The document name
 * @param {Array} delta - The document content as a Delta array
 * @returns {Promise<Buffer>} - The DOCX file as a buffer
 */
async function createPageViewDocxBuffer(docName, delta) {
  try {
    const docxElements = [];

    // Add document title
    docxElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: docName,
            bold: true,
            size: 32,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      })
    );

    // Add some spacing
    docxElements.push(new Paragraph({ children: [new TextRun({ text: "" })] }));

    // Extract footnotes from delta with actual content from database
    const footnotes = [];
    let currentPosition = 0;
    const footnoteMap = new Map();

    for (let i = 0; i < delta.length; i++) {
      const op = delta[i];

      if (typeof op.insert === "string") {
        if (op.attributes && op.attributes.footnote) {
          let threadId = op.attributes.footnote;
          if (typeof threadId === "object" && threadId !== null) {
            threadId = threadId.id || threadId.threadId;
          }
          if (typeof threadId !== "string") {
            continue;
          }
          if (!footnoteMap.has(threadId)) {
            const footnoteNumber = footnoteMap.size + 1;
            // Fetch actual footnote content from database
            let actualContent = `Footnote ${footnoteNumber}`;
            let deltaContent = "";
            if (op.attributes.footnoteContent) {
              deltaContent = op.attributes.footnoteContent;
            }
            if (op.attributes.footnoteText) {
              deltaContent = op.attributes.footnoteText;
            }
            if (op.attributes.note_on) {
              deltaContent = op.attributes.note_on;
            }
            if (op.attributes.content) {
              deltaContent = op.attributes.content;
            }
            if (op.attributes.text) {
              deltaContent = op.attributes.text;
            }
            if (op.attributes.footnote_content) {
              deltaContent = op.attributes.footnote_content;
            }
            if (op.attributes.footnote_text) {
              deltaContent = op.attributes.footnote_text;
            }
            try {
              const footnoteRecord = await prisma.footnote.findFirst({
                where: { threadId: threadId },
                select: {
                  id: true,
                  threadId: true,
                  content: true,
                  order: true,
                  docId: true,
                },
              });
              if (footnoteRecord) {
                if (footnoteRecord.content) {
                  if (deltaContent && deltaContent !== footnoteRecord.content) {
                    actualContent = `${footnoteRecord.content}\n\n${deltaContent}`;
                  } else {
                    actualContent = footnoteRecord.content;
                  }
                } else if (deltaContent) {
                  actualContent = deltaContent;
                }
              } else {
                if (deltaContent) {
                  actualContent = deltaContent;
                }
              }
            } catch (error) {
              if (deltaContent) {
                actualContent = deltaContent;
              }
            }
            const footnote = {
              threadId: threadId,
              number: footnoteNumber,
              position: currentPosition,
              content: actualContent,
              order: footnoteNumber,
              operationIndex: i,
            };
            footnoteMap.set(threadId, footnote);
            footnotes.push(footnote);
          } else {
            console.log(
              `📝 ${docName}: Footnote with thread ID ${threadId} already processed`
            );
          }
        }
        currentPosition += op.insert.length;
      }
    }

    // Convert delta to plain text
    const text = deltaToPlainText(delta);
    const paragraphs = text.split(/\n+/).filter((p) => p.trim());

    // Add content paragraphs with page breaks for page view format
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];

      // Add paragraph content
      docxElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: paragraph,
              size: 28, // Larger font for page view
            }),
          ],
        })
      );

      // Add page break after each paragraph (except the last one)
      if (i < paragraphs.length - 1) {
        docxElements.push(
          new Paragraph({
            children: [new TextRun({ text: "", break: 1 })],
            pageBreakBefore: true,
          })
        );
      }
    }

    // Add footnotes if any exist
    if (footnotes.length > 0) {
      // Add separator
      docxElements.push(
        new Paragraph({
          children: [new TextRun({ text: "" })],
        })
      );
      docxElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Footnotes:",
              bold: true,
              size: 24,
            }),
          ],
        })
      );

      // Add each footnote
      for (const footnote of footnotes) {
        docxElements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${footnote.number}. `,
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: footnote.content,
                size: 20,
              }),
            ],
          })
        );
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch margins
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children: docxElements,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  } catch (error) {
    console.error("Error creating page view DOCX buffer:", error);
    throw error;
  }
}

/**
 * Create a fallback side-by-side DOCX template when the main template fails
 * @param {Array} pages - Array of page objects with source and translation content
 * @returns {Promise<Buffer>} - The DOCX file as a buffer
 */
async function createFallbackSideBySideDocxTemplate(pages) {
  try {
    const docxElements = [];

    // Add document title
    docxElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Document Export",
            bold: true,
            size: 32,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      })
    );

    // Add some spacing
    docxElements.push(new Paragraph({ children: [new TextRun({ text: "" })] }));

    // Create table rows
    const tableRows = [];

    // Add header row
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Source",
                    bold: true,
                    color: "FFFFFF",
                    size: 24,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: {
              fill: "0066CC",
            },
            width: {
              size: 5000,
              type: WidthType.DXA,
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Translation",
                    bold: true,
                    color: "FFFFFF",
                    size: 24,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: {
              fill: "CC6600",
            },
            width: {
              size: 5000,
              type: WidthType.DXA,
            },
          }),
        ],
      })
    );

    // Add content rows from pages
    pages.forEach((page, index) => {
      const sourceContent = page.source || "";
      const translationContent = page.translation || "";

      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: sourceContent || " ",
                    }),
                  ],
                  spacing: {
                    before: 300,
                    after: 300,
                  },
                  indent: {
                    left: 150,
                    right: 150,
                  },
                }),
              ],
              width: {
                size: 5000,
                type: WidthType.DXA,
              },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: translationContent || " ",
                    }),
                  ],
                  spacing: {
                    before: 300,
                    after: 300,
                  },
                  indent: {
                    left: 100,
                    right: 100,
                  },
                }),
              ],
              width: {
                size: 5000,
                type: WidthType.DXA,
              },
            }),
          ],
        })
      );

      // Add page break if needed
      if (page.needsPageBreak && index < pages.length - 1) {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "", break: 1 })],
                    pageBreakBefore: true,
                  }),
                ],
                width: {
                  size: 10000,
                  type: WidthType.DXA,
                },
              }),
            ],
          })
        );
      }
    });

    // Create the table
    const table = new Table({
      rows: tableRows,
      width: {
        size: 10000,
        type: WidthType.DXA,
      },
      layout: "fixed",
      columnWidths: [5000, 5000],
      borders: {
        top: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        bottom: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        left: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        right: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "CCCCCC",
        },
        insideVertical: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "CCCCCC",
        },
      },
    });

    docxElements.push(table);

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docxElements,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  } catch (error) {
    console.error("Error creating fallback side-by-side DOCX template:", error);
    throw error;
  }
}

module.exports = {
  createSideBySideDocx,
  createLineByLineDocx,
  generateDocxBuffer,
  createSideBySideDocxTemplate,
  createDocxTemplate,
  createPageViewDocxBuffer,
  createFallbackSideBySideDocxTemplate,
  createSourceTranslationMapping,
  createPaginatedMapping,
};
