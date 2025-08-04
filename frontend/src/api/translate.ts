import { getHeaders, getAuthToken } from "./utils";

const server_url = import.meta.env.VITE_SERVER_URL;

// Streaming translation interfaces and functions
export type TargetLanguage =
  | "english"
  | "french"
  | "tibetan"
  | "portuguese"
  | "chinese";
export type TextType =
  | "mantra"
  | "sutra"
  | "commentary"
  | "philosophical treatises";
export type ModelName =
  | "claude"
  | "claude-haiku"
  | "claude-opus"
  | "gemini-pro";

// Constants for easy access to enum values
export const TARGET_LANGUAGES: TargetLanguage[] = [
  "english",
  "french",
  "tibetan",
  "portuguese",
  "chinese",
];
export const TEXT_TYPES: TextType[] = [
  "mantra",
  "sutra",
  "commentary",
  "philosophical treatises",
];
export const MODEL_NAMES: ModelName[] = [
  "claude",
  "claude-haiku",
  "claude-opus",
  "gemini-pro",
];

export interface StreamTranslationParams {
  texts: string[];
  target_language: TargetLanguage;
  text_type?: TextType;
  model_name?: ModelName;
  batch_size?: number;
  user_rules?: string;
}

/**
 * Starts a streaming translation request
 * Returns a ReadableStream that can be consumed to get real-time translation results
 */
export const streamTranslation = async (
  params: StreamTranslationParams,
  abortController?: AbortController
): Promise<Response> => {
  try {
    // Validate authentication before making the request

    const response = await fetch(`${server_url}/translate`, {
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
          "Access denied. You don't have permission to use translation services."
        );
      } else if (response.status === 400) {
        try {
          const errorData = await response.json();
          throw new Error(
            errorData.error ?? "Invalid translation request parameters."
          );
        } catch {
          throw new Error("Invalid translation request parameters.");
        }
      } else if (response.status >= 500) {
        throw new Error(
          "Translation service is temporarily unavailable. Please try again later."
        );
      } else {
        try {
          const errorData = await response.json();
          throw new Error(
            errorData.error ??
              `Translation request failed with status ${response.status}`
          );
        } catch {
          throw new Error(
            `Translation request failed with status ${response.status}`
          );
        }
      }
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to start translation stream");
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
  total_texts: number;
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

export interface TranslationStartEvent extends StreamEvent {
  type: "translation_start";
}

export interface TextCompletedEvent extends StreamEvent {
  type: "text_completed";
  text_number: number;
  total_texts: number;
  progress_percent: number;
  translation_preview?: string;
}

export interface BatchCompletedEvent extends StreamEvent {
  type: "batch_completed";
  batch_number: number;
  batch_id: string;
  batch_results: Array<{
    original_text: string;
    translated_text: string;
    metadata?: any;
  }>;
  cumulative_progress: number;
  processing_time: string;
}

export interface CompletionEvent extends StreamEvent {
  type: "completion";
  total_completed: number;
  total_texts: number;
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

export type TranslationStreamEvent =
  | InitializationEvent
  | PlanningEvent
  | BatchStartEvent
  | TranslationStartEvent
  | TextCompletedEvent
  | BatchCompletedEvent
  | CompletionEvent
  | ErrorEvent
  | RawContentEvent;

/**
 * Helper function to consume a streaming translation response with structured events
 * Calls onEvent for each structured event received
 * Calls onComplete when the stream is finished
 * Calls onError if an error occurs
 */
export const consumeTranslationStream = async (
  response: Response,
  onEvent: (event: TranslationStreamEvent) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void,
  abortController?: AbortController
): Promise<void> => {
  if (!response.body) {
    const error = new Error(
      "No response body available for streaming. The translation service may be unavailable."
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
          const parsedEvent = JSON.parse(eventData) as TranslationStreamEvent;

          // Handle error events immediately
          if (parsedEvent.type === "error") {
            const error = new Error(`Translation error: ${parsedEvent.error}`);
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
              "Authentication error during translation. Please log in again."
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
        : new Error("Unknown streaming error occurred during translation");
    onError?.(errorObj);
    throw errorObj;
  } finally {
    reader.releaseLock();
  }
};

/**
 * Validates translation parameters
 */
const validateTranslationParams = (params: StreamTranslationParams): void => {
  if (
    !params.texts ||
    !Array.isArray(params.texts) ||
    params.texts.length === 0
  ) {
    throw new Error("At least one text is required for translation");
  }

  if (!params.target_language || params.target_language.trim() === "") {
    throw new Error("Target language is required for translation");
  }

  // Check for empty texts
  const hasEmptyTexts = params.texts.some(
    (text) => !text || text.trim() === ""
  );
  if (hasEmptyTexts) {
    throw new Error("All texts must be non-empty for translation");
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
 * Complete streaming translation function that handles the entire process
 * This is a higher-level function that combines streamTranslation and consumeTranslationStream
 * Includes parameter validation and comprehensive error handling
 */
export const performStreamingTranslation = async (
  params: StreamTranslationParams,
  onEvent: (event: TranslationStreamEvent) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void,
  abortController?: AbortController
): Promise<void> => {
  try {
    // Validate parameters before starting
    validateTranslationParams(params);

    console.log("Starting streaming translation:", {
      textCount: params.texts.length,
      targetLanguage: params.target_language,
      model: params.model_name || "default",
    });

    const response = await streamTranslation(params, abortController);
    await consumeTranslationStream(
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
        : new Error("Translation failed unexpectedly");

    console.error("Translation error:", errorObj.message);
    onError?.(errorObj);
    throw errorObj;
  }
};

/**
 * Legacy function for backward compatibility - converts events to chunks
 * @deprecated Use performStreamingTranslation with event handlers instead
 */
export const performStreamingTranslationLegacy = async (
  params: StreamTranslationParams,
  onChunk: (chunk: string) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void
): Promise<void> => {
  await performStreamingTranslation(
    params,
    (event) => {
      // Convert events back to chunk format for legacy compatibility
      onChunk(JSON.stringify(event));
    },
    onComplete,
    onError
  );
};
