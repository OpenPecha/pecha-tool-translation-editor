const server_url = import.meta.env.VITE_SERVER_URL;

/**
 * Fetch all suggests for a specific document
 * @param {string} docId - The document ID
 * @param {string} token - The authentication token
 * @returns {Promise<any>} - The list of suggests
 */
export const fetchSuggests = async (docId: string, token: string) => {
  try {
    const response = await fetch(`${server_url}/suggests/${docId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch suggests");

    return await response.json();
  } catch (error) {
    console.error("Error fetching suggests:", error);
  }
};

/**
 * Fetch a specific suggests by ID
 * @param {string} id - The suggests ID
 * @param {string} token - The authentication token
 * @returns {Promise<any>} - The suggests data
 */
export const fetchSuggest = async (id: string, token: string) => {
  try {
    const response = await fetch(`${server_url}/suggest/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch suggest");

    return await response.json();
  } catch (error) {
    console.error("Error fetching suggests:", error);
  }
};

/**
 * Create a new suggests
 * @param {string} docId - The document ID
 * @param {string} userId - The user ID
 * @param {string} content - The suggests text
 * @param {number} startOffset - The initial start offset
 * @param {number} endOffset - The initial end offset
 * @param {string} token - The authentication token
 * @returns {Promise<any>} - The created suggests
 */
export const createSuggest = async (
  threadId:string,
  docId: string,
  userId: string,
  content: string,
  startOffset: number,
  endOffset: number,
  token: string,
) => {
  try {
    const response = await fetch(`${server_url}/suggests`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        docId,
        userId,
        content,
        initial_start_offset: startOffset,
        initial_end_offset: endOffset,
        threadId,
        token
      }),
    });
    if (!response.ok) throw new Error("Failed to create suggest");

    return await response.json();
  } catch (error) {
    console.error("Error creating suggests:", error);
  }
};

/**
 * Update an existing suggests
 * @param {string} id - The suggest ID
 * @param {string} content - The updated content
 * @param {string} token - The authentication token
 * @returns {Promise<any>} - The updated suggest
 */
export const updateSuggest = async (id: string,threadId:string, content: string, token: string) => {
  try {
    const response = await fetch(`${server_url}/suggests/${id}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content,threadId}),
    });

    if (!response.ok) throw new Error("Failed to update suggest");

    return await response.json();
  } catch (error) {
    console.error("Error updating suggest:", error);
  }
};

/**
 * Delete a suggest
 * @param {string} id - The suggest ID
 * @param {string} token - The authentication token
 * @returns {Promise<void>}
 */
export const deleteSuggest = async (id: string, token: string) => {
  try {
    const response = await fetch(`${server_url}/suggests/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error("Failed to delete suggests");
  } catch (error) {
    console.error("Error deleting suggests:", error);
  }
};


export const fetchSuggestsByThread = async (threadId: string) => {
  try {
    const response = await fetch(`${server_url}/suggests/thread/${threadId}`);
    return response.json();
  }
  catch (error) {
    console.error("Error fetching suggests:", error);
  }
}