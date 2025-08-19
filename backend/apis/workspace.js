/**
 * Workspace API functions for fetching tools and related data
 */

/**
 * Fetches the list of available tools from the workspace API
 * @returns {Promise<Object>} The API response containing tools data
 */
async function getToolsList() {
  try {
    const WORKSPACE_ENDPOINT = process.env.WORKSPACE_URL;
    const response = await fetch(WORKSPACE_ENDPOINT+'/api/tools/public');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate the response structure
    if (!data.success || !data.data) {
      throw new Error('Invalid API response structure');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching tools list:', error);
    throw error;
  }
}

module.exports = {
  getToolsList
};
