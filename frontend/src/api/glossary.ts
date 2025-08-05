import { getHeaders, getAuthToken } from "./utils";

const server_url = import.meta.env.VITE_SERVER_URL;

// Glossary extraction interfaces and functions
export type ModelName =
  | "claude"
  | "claude-haiku"
  | "claude-opus"
  | "gemini-pro";

// Constants for easy access to enum values
export const MODEL_NAMES: ModelName[] = [
  "claude",
  "claude-haiku",
  "claude-opus",
  "gemini-pro",
];

export interface GlossaryItem {
  original_text: string;
  translated_text: string;
  metadata?: Record<string, any>;
}

export interface StreamGlossaryExtractionParams {
  items: GlossaryItem[];
  model_name?: ModelName;
  batch_size?: number;
}

/**
 * Starts a streaming glossary extraction request
 * Returns a ReadableStream that can be consumed to get real-time extraction results
 */
export const streamGlossaryExtraction = async (
  params: StreamGlossaryExtractionParams,
  abortController?: AbortController
): Promise<Response> => {
  try {
    const response = await fetch(`${server_url}/glossary/extract/stream`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(params),
      signal: abortController?.signal,
    });

    if (!response.ok) {
      // Handle different types of HTTP errors
      if (response.status === 401) {
        throw new Error("Authentication failed. Please log in again.");
      } else if (response.status === 403) {
        throw new Error(
          "Access denied. You don't have permission to use glossary services."
        );
      } else if (response.status === 400) {
        try {
          const errorData = await response.json();
          throw new Error(
            errorData.error ?? "Invalid glossary extraction request parameters."
          );
        } catch {
          throw new Error("Invalid glossary extraction request parameters.");
        }
      } else if (response.status >= 500) {
        throw new Error(
          "Glossary service is temporarily unavailable. Please try again later."
        );
      } else {
        try {
          const errorData = await response.json();
          throw new Error(
            errorData.error ??
              `Glossary extraction request failed with status ${response.status}`
          );
        } catch {
          throw new Error(
            `Glossary extraction request failed with status ${response.status}`
          );
        }
      }
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to start glossary extraction stream");
  }
};

// Streaming event types for better type safety
export interface StreamEvent {
  type: string;
  timestamp: string;
  message?: string;
}

export interface InitializationEvent extends StreamEvent {
  type: "initialization";
  total_items: number;
}

export interface PlanningEvent extends StreamEvent {
  type: "planning";
  total_batches: number;
  batch_size: number;
}

export interface BatchStartEvent extends StreamEvent {
  type: "batch_start";
  batch_number: number;
  progress_percent: number;
}

export interface ExtractionStartEvent extends StreamEvent {
  type: "extraction_start";
}

export interface ItemCompletedEvent extends StreamEvent {
  type: "item_completed";
  item_number: number;
  total_items: number;
  progress_percent: number;
  glossary_preview?: string;
}

export interface BatchCompletedEvent extends StreamEvent {
  type: "batch_completed";
  batch_number: number;
  batch_id: string;
  batch_results: Array<{
    original_text: string;
    translated_text: string;
    glossary_terms: Array<{
      original: string;
      translated: string;
      definition?: string;
      context?: string;
    }>;
    metadata?: any;
  }>;
  cumulative_progress: number;
  processing_time: string;
}

export interface CompletionEvent extends StreamEvent {
  type: "completion";
  total_completed: number;
  total_items: number;
  glossary_terms?: Array<{
    original: string;
    translated: string;
    definition?: string;
    context?: string;
    frequency?: number;
  }>;
}

export interface ErrorEvent extends StreamEvent {
  type: "error";
  error: string;
  details?: string;
}

export interface RawContentEvent extends StreamEvent {
  type: "raw_content";
  content: string;
}

export type GlossaryStreamEvent =
  | InitializationEvent
  | PlanningEvent
  | BatchStartEvent
  | ExtractionStartEvent
  | ItemCompletedEvent
  | BatchCompletedEvent
  | CompletionEvent
  | ErrorEvent
  | RawContentEvent;

/**
 * Helper function to consume a streaming glossary extraction response with structured events
 * Calls onEvent for each structured event received
 * Calls onComplete when the stream is finished
 * Calls onError if an error occurs
 */
export const consumeGlossaryStream = async (
  response: Response,
  onEvent: (event: GlossaryStreamEvent) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void,
  abortController?: AbortController
): Promise<void> => {
  if (!response.body) {
    const error = new Error(
      "No response body available for streaming. The glossary service may be unavailable."
    );
    onError?.(error);
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      // Check if the request has been aborted
      if (abortController?.signal.aborted) {
        reader.cancel();
        return; // Exit silently on abort
      }

      const { done, value } = await reader.read();

      if (done) {
        onComplete?.();
        break;
      }

      // Decode chunk and add to buffer
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Process complete lines in buffer
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        // Handle Server-Sent Events format
        let eventData = line;
        if (line.startsWith("data: ")) {
          eventData = line.substring(6).trim();
        }

        if (!eventData) continue;

        try {
          const parsedEvent = JSON.parse(eventData) as GlossaryStreamEvent;

          // Handle error events immediately
          if (parsedEvent.type === "error") {
            const error = new Error(
              `Glossary extraction error: ${parsedEvent.error}`
            );
            onError?.(error);
            return; // Stop processing on error
          }

          // Call the event handler with the parsed event
          onEvent(parsedEvent);
        } catch (parseError) {
          console.warn(
            "Failed to parse streaming event:",
            parseError,
            "Raw line:",
            line
          );

          // Check for authentication errors in raw text
          if (
            line.toLowerCase().includes("authentication") ||
            line.toLowerCase().includes("unauthorized") ||
            line.toLowerCase().includes("401")
          ) {
            const error = new Error(
              "Authentication error during glossary extraction. Please log in again."
            );
            onError?.(error);
            return;
          }
        }
      }
    }
  } catch (error) {
    // Handle abort errors gracefully
    if (error instanceof Error && error.name === "AbortError") {
      return; // Exit silently on abort
    }

    const errorObj =
      error instanceof Error
        ? error
        : new Error(
            "Unknown streaming error occurred during glossary extraction"
          );
    onError?.(errorObj);
    throw errorObj;
  } finally {
    reader.releaseLock();
  }
};

/**
 * Validates glossary extraction parameters
 */
const validateGlossaryParams = (
  params: StreamGlossaryExtractionParams
): void => {
  if (
    !params.items ||
    !Array.isArray(params.items) ||
    params.items.length === 0
  ) {
    throw new Error("At least one item is required for glossary extraction");
  }

  // Check for empty texts in items
  const hasInvalidItems = params.items.some(
    (item) =>
      !item.original_text ||
      !item.translated_text ||
      item.original_text.trim() === "" ||
      item.translated_text.trim() === ""
  );
  if (hasInvalidItems) {
    throw new Error(
      "All items must have non-empty original_text and translated_text for glossary extraction"
    );
  }

  // Validate batch_size if provided
  if (
    params.batch_size !== undefined &&
    (params.batch_size < 1 || params.batch_size > 10)
  ) {
    throw new Error("Batch size must be between 1 and 10");
  }
};

/**
 * Complete streaming glossary extraction function that handles the entire process
 * This is a higher-level function that combines streamGlossaryExtraction and consumeGlossaryStream
 * Includes parameter validation and comprehensive error handling
 */
export const performStreamingGlossaryExtraction = async (
  params: StreamGlossaryExtractionParams,
  onEvent: (event: GlossaryStreamEvent) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void,
  abortController?: AbortController
): Promise<void> => {
  try {
    // Validate parameters before starting
    validateGlossaryParams(params);

    console.log("Starting streaming glossary extraction:", {
      itemCount: params.items.length,
      model: params.model_name || "default",
    });

    const response = await streamGlossaryExtraction(params, abortController);
    await consumeGlossaryStream(
      response,
      onEvent,
      onComplete,
      onError,
      abortController
    );
  } catch (error) {
    // Handle abort errors gracefully
    if (error instanceof Error && error.name === "AbortError") {
      return; // Exit silently on abort
    }

    const errorObj =
      error instanceof Error
        ? error
        : new Error("Glossary extraction failed unexpectedly");

    console.error("Glossary extraction error:", errorObj.message);
    onError?.(errorObj);
    throw errorObj;
  }
};

/**
 * Legacy function for backward compatibility - converts events to chunks
 * @deprecated Use performStreamingGlossaryExtraction with event handlers instead
 */
export const performStreamingGlossaryExtractionLegacy = async (
  params: StreamGlossaryExtractionParams,
  onChunk: (chunk: string) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void
): Promise<void> => {
  await performStreamingGlossaryExtraction(
    params,
    (event) => {
      // Convert events back to chunk format for legacy compatibility
      onChunk(JSON.stringify(event));
    },
    onComplete,
    onError
  );
};
