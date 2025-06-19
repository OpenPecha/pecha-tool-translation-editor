import { getHeaders } from "./utils";

const server_url = import.meta.env.VITE_SERVER_URL;

/**
 * Fetch all footnotes for a specific document
 * @param {string} docId - The document ID
 * @returns {Promise<any>} - The list of footnotes
 */
export const fetchFootnotes = async (docId: string) => {
  try {
    const response = await fetch(`${server_url}/footnotes/${docId}`, {
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error("Failed to fetch footnotes");

    return await response.json();
  } catch (error) {
    console.error("Error fetching footnotes:", error);
    return [];
  }
};

/**
 * Fetch a specific footnote by ID
 * @param {string} footnoteId - The footnote ID
 * @returns {Promise<any>} - The footnote data
 */
export const fetchFootnote = async (footnoteId: string) => {
  try {
    const response = await fetch(`${server_url}/footnotes/${footnoteId}`, {
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error("Failed to fetch footnote");

    return await response.json();
  } catch (error) {
    console.error("Error fetching footnote:", error);
  }
};

/**
 * Fetch footnotes by thread ID
 * @param {string} threadId - The thread ID
 * @returns {Promise<any>} - The list of footnotes in the thread
 */
export const fetchFootnotesByThreadId = async (threadId: string) => {
  try {
    const response = await fetch(`${server_url}/footnotes/thread/${threadId}`, {
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error("Failed to fetch footnotes");

    return await response.json();
  } catch (error) {
    console.error("Error fetching footnotes:", error);
  }
};

/**
 * Create a new footnote
 * @param {string} docId - The document ID
 * @param {string} userId - The user ID
 * @param {string} content - The footnote text
 * @param {number} startOffset - The initial start offset
 * @param {number} endOffset - The initial end offset
 * @param {string} threadId - The thread ID
 * @param {string} note_on - The text or element this footnote refers to
 * @returns {Promise<any>} - The created footnote
 */
export const createFootnote = async (
  docId: string,
  userId: string,
  content: string,
  startOffset: number,
  endOffset: number,
  threadId: string,
  note_on: string
) => {
  try {
    const response = await fetch(`${server_url}/footnotes`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        docId,
        userId,
        content,
        initial_start_offset: startOffset,
        initial_end_offset: endOffset,
        threadId,
        note_on,
      }),
    });

    if (!response.ok) throw new Error("Failed to create footnote");

    return await response.json();
  } catch (error) {
    console.error("Error creating footnote:", error);
  }
};

/**
 * Update an existing footnote
 * @param {string} footnoteId - The footnote ID
 * @param {string} content - The updated content
 * @returns {Promise<any>} - The updated footnote
 */
export const updateFootnote = async (footnoteId: string, content: string) => {
  try {
    const response = await fetch(`${server_url}/footnotes/${footnoteId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        content,
      }),
    });

    if (!response.ok) throw new Error("Failed to update footnote");

    return await response.json();
  } catch (error) {
    console.error("Error updating footnote:", error);
  }
};

/**
 * Delete a footnote
 * @param {string} footnoteId - The footnote ID
 * @returns {Promise<void>}
 */
export const deleteFootnote = async (footnoteId: string) => {
  try {
    const response = await fetch(`${server_url}/footnotes/${footnoteId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error("Failed to delete footnote");
  } catch (error) {
    console.error("Error deleting footnote:", error);
  }
};
