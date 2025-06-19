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
} = require("docx");
const PizZip = require("pizzip");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const path = require("path");
const Docxtemplater = require("docxtemplater");
const { TEMPLATE_PATH } = require("./const");
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
 * Convert Markdown to DOCX using Pandoc
 * @param {string} markdown - Markdown content
 * @param {string} outputPath - Path for the output DOCX file
 * @param {boolean} useTemplate - Whether to use the template (default: true)
 * @returns {Promise<Buffer>} - DOCX file as buffer
 */
async function convertMarkdownToDocx(markdown, outputPath, useTemplate = true) {
  try {
    // Ensure uploads directory exists
    const uploadsDir = path.dirname(outputPath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create temporary markdown file
    const tempMarkdownPath = outputPath.replace(".docx", ".md");
    fs.writeFileSync(tempMarkdownPath, markdown, "utf8");

    // Convert using Pandoc with or without template
    let pandocCommand;
    if (useTemplate) {
      pandocCommand = `pandoc "${tempMarkdownPath}" -o "${outputPath}" --reference-doc="${TEMPLATE_PATH}"`;
    } else {
      pandocCommand = `pandoc "${tempMarkdownPath}" -o "${outputPath}"`;
    }
    console.log(`🔄 Running Pandoc command: ${pandocCommand}`);

    await execAsync(pandocCommand);

    // Read the generated DOCX file
    const docxBuffer = fs.readFileSync(outputPath);

    // Clean up temporary files
    fs.unlinkSync(tempMarkdownPath);
    fs.unlinkSync(outputPath);

    console.log(
      `✅ Successfully converted Markdown to DOCX: ${docxBuffer.length} bytes`
    );
    return docxBuffer;
  } catch (error) {
    console.error("❌ Error converting Markdown to DOCX:", error);
    throw error;
  }
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

    const maxParagraphs = Math.max(
      sourceParagraphs.length,
      translationParagraphs.length
    );

    // Create pages array with source/translation pairs (clean format)
    const pages = [];
    for (let i = 0; i < maxParagraphs; i++) {
      const sourcePara = sourceParagraphs[i] || "";
      const translationPara = translationParagraphs[i] || "";
      const pageBreak = i >= 0 ? '<w:br w:type="page"/>' : "";
      // dont push if source and translation are empty
      if (sourcePara.trim() === "") {
        continue;
      }
      const pageNumber = i + 1;
      pages.push({
        source: sourcePara,
        translation: translationPara,
        isLast: i === maxParagraphs - 1, // Flag to identify last page for template
        pageBreak,
        needsPageBreak: i > 0,
        tibetanPageMarker: pageNumber % 2 === 1 ? "༄༅། །" : "",
        isOddPage: pageNumber % 2 === 1,
      });
    }
    // Check if template exists
    if (!fs.existsSync(TEMPLATE_PATH)) {
      console.warn(
        `Template not found at ${TEMPLATE_PATH}, using fallback DOCX`
      );
      return createFallbackSideBySideDocxTemplate(pages);
    }

    sendProgress(progressStreams, progressId, 50, "Processing template...");

    // Read the template file
    const templateContent = fs.readFileSync(TEMPLATE_PATH);

    // Use docxtemplater to populate the template
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
      targetLanguage: targetLanguage,
      totalPages: pages.length,
      pages: pages,
    };

    sendProgress(progressStreams, progressId, 70, "Rendering template...");

    // Render the template with data
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
 * Create a source-only DOCX template
 * @param {string} docName - The document name
 * @param {Array} sourceDelta - The source document content as a Delta array
 * @param {string} progressId - Progress tracking ID
 * @returns {Promise<Buffer>} - The DOCX file as a buffer
 */
async function createSourceOnlyDocxTemplate(docName, sourceDelta, progressId) {
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

    // Create pages array with source only (clean format)
    const pages = [];
    for (let i = 0; i < sourceParagraphs.length; i++) {
      const pageBreak = i >= 0 ? '<w:br w:type="page"/>' : "";
      const pageNumber = i + 1;
      pages.push({
        source: sourceParagraphs[i],
        translation: "", // Empty translation
        isLast: true, // Flag to identify last page for template
        pageBreak,
        needsPageBreak: i > 0,
        tibetanPageMarker: pageNumber % 2 === 1 ? "༄༅། །" : "",
        isOddPage: pageNumber % 2 === 1,
      });
    }

    // Check if template exists
    if (!fs.existsSync(TEMPLATE_PATH)) {
      console.warn(
        `Template not found at ${TEMPLATE_PATH}, using fallback DOCX`
      );
      return createFallbackSideBySideDocxTemplate(pages);
    }

    sendProgress(progressStreams, progressId, 50, "Processing template...");

    // Read the template file
    const templateContent = fs.readFileSync(TEMPLATE_PATH);

    // Use docxtemplater to populate the template
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
    };

    console.log(
      `📊 Template data prepared for ${docName} (source only): ${pages.length} pages`
    );

    sendProgress(progressStreams, progressId, 70, "Rendering template...");

    // Render the template with data
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
    console.error("Error creating source-only DOCX template:", error);
    // Fallback to simple structure
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

module.exports = {
  createDocxBuffer,
  createSideBySideDocx,
  createLineByLineDocx,
  convertMarkdownToDocx,
  createSideBySideDocxTemplate,
  createSourceOnlyDocxTemplate,
  createPageViewDocxBuffer,
};
