import { getHeaders } from "./utils";
const server_url = import.meta.env.VITE_SERVER_URL;

// New OpenPecha API functions for the text loader
/**
 * Fetch list of texts from OpenPecha
 * @param options - Query parameters for filtering texts
 * @returns List of texts
 */
export const fetchTexts = async ({
  type,
  limit,
  offset,
  language,
}: {
  type?: string;
  limit?: number;
  offset?: number;
  language?: string;
}) => {
  const getUrl = () => {
    const params = new URLSearchParams();
    if (type) params.append("type", type);
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());
    if (language) params.append("language", language);
    return `${server_url}/openpecha/texts?${params.toString()}`;
  };
  const response = await fetch(getUrl(), {
    headers: getHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch texts");
  }
  return response.json();
};

/**
 * Fetch text instances for a specific text ID
 * @param textId - Text ID
 * @returns List of text instances
 */
export const fetchInstances = async (textId: string) => {
  const response = await fetch(`${server_url}/openpecha/${textId}/instances`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch instances");
  }
  return response.json();
};

/**
 * Fetch text content by instance ID
 * @param textId - Instance ID
 * @returns Text content
 */
export const fetchTextContent = async (textId: string) => {
  const response = await fetch(`${server_url}/openpecha/instances/${textId}`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch text content");
  }
  return response.json();
};

/**
 * Fetch annotations by annotation ID
 * @param annotationId - Annotation ID
 * @returns Annotation content
 */
export const fetchAnnotations = async (annotationId: string) => {
  const response = await fetch(
    `${server_url}/openpecha/annotations/${annotationId}`,
    {
      headers: getHeaders(),
    }
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch annotations");
  }
  return response.json();
};

export interface TranslationPayload {
  language: string;
  content: string;
  title: string;
  segmentation: any;
  target_annotation: any;
  alignment_annotation: any;
}

export const uploadTranslationToOpenpecha = async (
  instance_id: string,
  payload: TranslationPayload,
  translation_doc_id: string
) => {
  const response = await fetch(
    `${server_url}/openpecha/instances/${instance_id}/translation/${translation_doc_id}`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to upload translation");
  }
  return response.json();
};

export interface SegmentWithContent {
  segment_id: string;
  initialStartOffset: number;
  initialEndOffset: number;
  selectedText: string;
}

/**
 * Fetch segment-related data with content combined in a single call
 * This function combines getSegmentRelated and getSegmentsContent into one API call
 * @param instanceId - Instance ID
 * @param spanStart - Start position of the span
 * @param spanEnd - End position of the span
 * @param transfer - Transfer parameter (default: false)
 * @returns Array of segments with segment_id, offsets, and content
 */
export const fetchSegmentsWithContent = async (
  instanceId: string,
  spanStart: number,
  spanEnd: number,
  transfer: boolean = false
): Promise<SegmentWithContent[]> => {
  const params = new URLSearchParams({
    span_start: spanStart.toString(),
    span_end: spanEnd.toString(),
    transfer: transfer.toString(),
  });
  const response = await fetch(
    `${server_url}/openpecha/instances/${instanceId}/segments-with-content?${params.toString()}`,
    {
      headers: getHeaders(),
    }
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || "Failed to fetch segments with content"
    );
  }
  return response.json();
};
