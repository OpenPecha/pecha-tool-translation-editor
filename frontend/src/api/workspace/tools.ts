import { getHeaders } from "../utils";

export const fetchTools = async () => {
  try {
    const response = await fetch('https://pecha-workspace-1.onrender.com/api/tools/', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        ...getHeaders()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tools: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching tools:', error);
    throw error;
  }
};
