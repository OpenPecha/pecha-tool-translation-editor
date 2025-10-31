import { getHeaders } from "./utils";
const server_url = import.meta.env.VITE_SERVER_URL;

export interface MatchedEntry {
  root_display_text: string;
  commentary_1: string;
  commentary_2: string;
  commentary_3: string;
  sanskrit_text: string;
}

export interface ResourceMatch {
  fileName: string;
  metadata: any;
  matchedEntry: MatchedEntry;
}

export interface SegmentSearchResponse {
  success: boolean;
  segment: string;
  matches: ResourceMatch[];
  totalMatches: number;
}

export interface SegmentSearchRequest {
  segment: string;
}

/**
 * Search for a segment in linked resources
 * @param segment - The text segment to search for in root texts
 * @returns Promise with search results
 */
export const searchSegmentInResources = async (
  segment: string
): Promise<SegmentSearchResponse> => {
  try {
    const response = await fetch(`${server_url}/resources`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ segment }),
    });

    if (response.ok) {
      const data: SegmentSearchResponse = await response.json();
      return data;
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to search segment");
    }
  } catch (error) {
    console.error("Error searching segment in resources:", error);
    throw error;
  }
};
