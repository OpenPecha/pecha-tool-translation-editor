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

module.exports = {
  convertMarkdownToDocx,
};
