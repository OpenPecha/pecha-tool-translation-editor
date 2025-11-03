import mammoth from "mammoth";

export async function docxToText(fileBuffer) {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value.trim();
  } catch (error) {
    console.error("Error parsing DOCX file:", error);
    throw error;
  }
}
