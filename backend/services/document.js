const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Fetches a document's details including its content from the current version.
 * @param {string} documentId - The ID of the document to fetch.
 * @returns {Promise<object|null>} - An object containing the document's language, name, and content, or null if not found.
 */
async function getDocumentWithContent(documentId) {
  const document = await prisma.doc.findUnique({
    where: { id: documentId },
    select: {
      name: true,
      language: true,
      currentVersion: {
        select: {
          content: true,
        },
      },
    },
  });

  if (!document) {
    return null;
  }

  const content = document.currentVersion
    ? document.currentVersion.content
    : null;

  return {
    name: document.name,
    language: document.language,
    content: content,
  };
}

module.exports = {
  getDocumentWithContent,
};
