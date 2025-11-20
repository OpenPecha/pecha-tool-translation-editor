import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createDocumentWithContent } from "@/api/document";
import { ErrorDisplay } from "@/components/shared/modals";
import { Button } from "@/components/ui/button";
import { QueryObserverResult } from "@tanstack/react-query";
import { useBdrcSearch, BdrcSearchResult } from "@/hooks/uesBDRC";
import { Search, AlertCircle, ExternalLink } from "lucide-react";
import {
  fetchInstances,
  fetchText,
  fetchTextContent,
  fetchAnnotations,
} from "@/api/openpecha";
import { useTitleSearch } from "@/hooks/useTitleSearch";

export function OpenPechaTranslationLoader({
  rootId,
  onSuccess,
  refetchTranslations,
}: {
  readonly rootId: string;
  readonly onSuccess: (id: string) => void;
  readonly refetchTranslations: () => Promise<
    QueryObserverResult<unknown, Error>
  >;
}) {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showBdrcResults, setShowBdrcResults] = useState(false);
  const [showTitleResults, setShowTitleResults] = useState(false);
  const [selectedBdrcResult, setSelectedBdrcResult] =
    useState<BdrcSearchResult | null>(null);
  const [isCheckingBdrcText, setIsCheckingBdrcText] = useState(false);
  const [isCheckingTitleText, setIsCheckingTitleText] = useState(false);
  const [bdrcTextNotFound, setBdrcTextNotFound] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState("");
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [processedText, setProcessedText] = useState("");
  const [selectedText, setSelectedText] = useState<{
    id: string;
    title:
      | string
      | { bo?: string; en?: string; [key: string]: string | undefined };
    language: string;
  } | null>(null);

  const {
    results: bdrcResults,
    isLoading: isLoadingBdrc,
    error: bdrcError,
  } = useBdrcSearch(searchQuery, "Instance", 1000);

  const { 
    data: titleSearchResults, 
    isLoading: isLoadingTitleSearch, 
    error: titleSearchError 
  } = useTitleSearch(searchQuery, 1000);

  // Apply segmentation to text content
  const applySegmentation = (
    text: string,
    segments: Array<{ span: { start: number; end: number } }>
  ): string[] => {
    if (typeof text !== "string" || !Array.isArray(segments)) {
      throw new Error(
        "Invalid arguments: expected text (string) and segments (array)."
      );
    }
    return segments.map((segment) => {
      const { start, end } = segment.span;

      if (start < 0 || end > text.length || start >= end) {
        throw new Error(`Invalid span range: start=${start}, end=${end}`);
      }

      return text.slice(start, end);
    });
  };

  // Handle title search result selection
  const handleTitleResultSelect = React.useCallback(
    async (result: { text_id: string; title: string; instance_id: string }) => {
      setShowTitleResults(false);
      setShowBdrcResults(false);
      setBdrcTextNotFound(false);
      setIsCheckingTitleText(true);

      try {
        // Fetch text details
        const text = await fetchText(result.text_id);

        if (!text?.id) {
          setIsCheckingTitleText(false);
          setBdrcTextNotFound(true);
          return;
        }

        // Set the text
        setSelectedText(text);
        setSelectedTextId(result.text_id);
        setSelectedInstanceId(result.instance_id);

        // Fetch text content with annotations
        const textContent = await fetchTextContent(result.instance_id);

        if (!textContent?.content) {
          setIsCheckingTitleText(false);
          setBdrcTextNotFound(true);
          return;
        }

        // Find segmentation annotation
        let annotationId: string | null = null;
        if (textContent.annotations && textContent.annotations.length > 0) {
          const segmentation = textContent.annotations.find(
            (anno: { type?: string }) => anno.type === "segmentation"
          );
          if (segmentation?.annotation_id) {
            annotationId = segmentation.annotation_id;
          }
        }

        // If segmentation annotation exists, fetch and apply it
        if (annotationId) {
          const annotations = await fetchAnnotations(annotationId);

          if (annotations?.data && Array.isArray(annotations.data)) {
            const segmentedText = applySegmentation(
              textContent.content,
              annotations.data
            );
            setProcessedText(segmentedText.join("\n"));
          } else {
            // No segmentation, use raw content
            setProcessedText(textContent.content);
          }
        } else {
          // No segmentation annotation, use raw content
          setProcessedText(textContent.content);
        }

        setIsCheckingTitleText(false);
      } catch (err) {
        console.error("Error fetching text from OpenPecha:", err);
        setIsCheckingTitleText(false);
        setBdrcTextNotFound(true);
      }
    },
    []
  );

  // Handle BDRC result selection
  const handleBdrcResultSelect = React.useCallback(
    async (result: BdrcSearchResult) => {
      setSelectedBdrcResult(result);
      setShowBdrcResults(false);
      setBdrcTextNotFound(false);
      setIsCheckingBdrcText(true);

      if (!result.workId) {
        setIsCheckingBdrcText(false);
        setBdrcTextNotFound(true);
        return;
      }

      try {
        // Fetch text from openpecha using workId
        const text = await fetchText(result.workId);

        if (!text?.id) {
          setIsCheckingBdrcText(false);
          setBdrcTextNotFound(true);
          return;
        }

        // Set the text
        setSelectedText(text);
        setSelectedTextId(text.id);

        // Fetch instances for this text
        const instances = await fetchInstances(text.id);

        if (!instances || instances.length === 0) {
          setIsCheckingBdrcText(false);
          setBdrcTextNotFound(true);
          return;
        }

        // Find the critical instance or use the instanceId from result
        let targetInstanceId: string | null = null;

        if (result.instanceId) {
          // Use the instanceId from BDRC result if provided
          const foundInstance = instances.find(
            (inst: { id: string }) => inst.id === result.instanceId
          );
          if (foundInstance) {
            targetInstanceId = result.instanceId;
          }
        }

        // If no instanceId from result, find critical instance
        if (!targetInstanceId) {
          const criticalInstance = instances.find(
            (inst: { type?: string }) =>
              inst.type === "critical" || inst.type === "content"
          );
          if (criticalInstance) {
            targetInstanceId = criticalInstance.id;
          } else {
            // Use first instance as fallback
            targetInstanceId = instances[0].id;
          }
        }

        if (!targetInstanceId) {
          setIsCheckingBdrcText(false);
          setBdrcTextNotFound(true);
          return;
        }

        setSelectedInstanceId(targetInstanceId);

        // Fetch text content with annotations
        const textContent = await fetchTextContent(targetInstanceId);

        if (!textContent?.content) {
          setIsCheckingBdrcText(false);
          setBdrcTextNotFound(true);
          return;
        }

        // Find segmentation annotation
        let annotationId: string | null = null;
        if (textContent.annotations && textContent.annotations.length > 0) {
          const segmentation = textContent.annotations.find(
            (anno: { type?: string }) => anno.type === "segmentation"
          );
          if (segmentation?.annotation_id) {
            annotationId = segmentation.annotation_id;
          }
        }

        // If segmentation annotation exists, fetch and apply it
        if (annotationId) {
          const annotations = await fetchAnnotations(annotationId);

          if (annotations?.data && Array.isArray(annotations.data)) {
            const segmentedText = applySegmentation(
              textContent.content,
              annotations.data
            );
            setProcessedText(segmentedText.join("\n"));
          } else {
            // No segmentation, use raw content
            setProcessedText(textContent.content);
          }
        } else {
          // No segmentation annotation, use raw content
          setProcessedText(textContent.content);
        }

        setIsCheckingBdrcText(false);
      } catch (err) {
        console.error("Error fetching text from OpenPecha:", err);
        setIsCheckingBdrcText(false);
        setBdrcTextNotFound(true);
      }
    },
    []
  );

  const extractTitle = (
    title:
      | string
      | { bo?: string; en?: string; [key: string]: string | undefined }
      | undefined,
    fallback: string = ""
  ): string => {
    if (typeof title === "string") return title;
    if (!title) return fallback;
    return title.bo ?? title.en ?? title[Object.keys(title)[0]] ?? fallback;
  };

  const createTranslationMutation = useMutation({
    mutationFn: async () => {
      if (!processedText.trim()) {
        throw new Error("No text content available");
      }
      if (!selectedTextId) {
        throw new Error("Please select a text");
      }
      if (!selectedInstanceId) {
        throw new Error("Please select a instance");
      }

      const formData = new FormData();
      const documentName = extractTitle(
        selectedText?.title,
        `OpenPecha-${selectedTextId}`
      );
      const uniqueIdentifier = `${documentName}-${Date.now()}`;

      formData.append("name", documentName);
      formData.append("identifier", uniqueIdentifier);
      formData.append("isRoot", "false");
      formData.append("isPublic", "false");
      formData.append("language", selectedText?.language || "tibetan");
      formData.append("rootId", rootId);
      formData.append("content", processedText);
      formData.append(
        "metadata",
        JSON.stringify({
          text_id: selectedTextId,
          instance_id: selectedInstanceId,
        })
      );
      return createDocumentWithContent(formData);
    },
    onSuccess: (response) => {
      setIsCreating(false);
      onSuccess(response.id);
      refetchTranslations?.();
      navigate(`/documents/${rootId}?translation=${response.id}`);
    },
    onError: (error: Error) => {
      console.error("Error creating OpenPecha translation:", error);
      setError(error.message || "Failed to create OpenPecha translation");
      setIsCreating(false);
    },
  });

  const handleCreateTranslation = () => {
    if (!selectedTextId) {
      setError("Please select a pecha");
      return;
    }
    if (!selectedInstanceId) {
      setError("Please select a version");
      return;
    }
    if (!processedText.trim()) {
      setError("No text content available");
      return;
    }
    setError("");
    setIsCreating(true);
    createTranslationMutation.mutate();
  };

  const hasValidContent = !!(
    selectedTextId &&
    selectedInstanceId &&
    processedText.trim()
  );

  // Cataloger URL
  const CATALOGER_URL =
    import.meta.env.VITE_CATALOGER_FRONTEND_URL || "http://localhost:8000";
  const catalogerUrl = React.useMemo(() => {
    const workIdParam = selectedBdrcResult?.workId
      ? `create?w_id=${selectedBdrcResult.workId}&i_id=${selectedBdrcResult.instanceId}`
      : "";
    return `${CATALOGER_URL}/${workIdParam}`;
  }, [CATALOGER_URL, selectedBdrcResult?.workId]);

  // Render title search results
  const renderTitleSearchResults = () => {
    if (isLoadingTitleSearch) {
      return (
        <div className="w-full bg-white border border-gray-300 rounded-md shadow-lg p-4">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 -mx-4 -mt-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700">OpenPecha</h3>
          </div>
          <div className="flex items-center space-x-2 text-sm text-blue-600">
            <svg
              className="animate-spin h-4 w-4 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Searching OpenPecha...</span>
          </div>
        </div>
      );
    }

    if (titleSearchError) {
      return (
        <div className="w-full bg-white border border-red-300 rounded-md shadow-lg p-4">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 -mx-4 -mt-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700">OpenPecha</h3>
          </div>
          <p className="text-sm text-red-600">
            Error searching OpenPecha: {titleSearchError.message || String(titleSearchError)}
          </p>
        </div>
      );
    }

    if (titleSearchResults && Array.isArray(titleSearchResults) && titleSearchResults.length > 0) {
      return (
        <div className="w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 sticky top-0">
            <h3 className="text-sm font-semibold text-gray-700">OpenPecha</h3>
          </div>
          {titleSearchResults.map((result: { text_id: string; title: string; instance_id: string }) => (
            <button
              key={`title-${result.text_id}-${result.instance_id}`}
              onClick={() => handleTitleResultSelect(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="font-medium text-sm text-gray-900">
                {result.title || "Untitled"}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Text ID: {result.text_id}
              </div>
              <div className="text-xs text-gray-500">
                Instance ID: {result.instance_id}
              </div>
            </button>
          ))}
        </div>
      );
    }

    if (searchQuery.trim() && !isLoadingTitleSearch) {
      return (
        <div className="w-full bg-white border border-gray-300 rounded-md shadow-lg p-4">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 -mx-4 -mt-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700">OpenPecha</h3>
          </div>
          <p className="text-sm text-gray-600">No OpenPecha texts found</p>
        </div>
      );
    }

    return null;
  };

  // Render BDRC search results
  const renderBdrcSearchResults = () => {
    if (isLoadingBdrc) {
      return (
        <div className="w-full bg-white border border-gray-300 rounded-md shadow-lg p-4">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 -mx-4 -mt-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700">BDRC Results</h3>
          </div>
          <div className="flex items-center space-x-2 text-sm text-blue-600">
            <svg
              className="animate-spin h-4 w-4 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Searching BDRC...</span>
          </div>
        </div>
      );
    }

    if (bdrcError) {
      return (
        <div className="w-full bg-white border border-red-300 rounded-md shadow-lg p-4">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 -mx-4 -mt-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700">BDRC Results</h3>
          </div>
          <p className="text-sm text-red-600">
            Error searching BDRC: {bdrcError}
          </p>
        </div>
      );
    }

    if (bdrcResults.length > 0) {
      return (
        <div className="w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 sticky top-0">
            <h3 className="text-sm font-semibold text-gray-700">BDRC Results</h3>
          </div>
          {bdrcResults.map((result) => (
            <button
              key={result.workId || result.instanceId || `bdrc-${result.title}`}
              onClick={() => handleBdrcResultSelect(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="font-medium text-sm text-gray-900">
                {result.title || result.workId || "Untitled"}
              </div>
              {result.workId && (
                <div className="text-xs text-gray-500 mt-1">
                  BDRC ID: {result.workId}
                </div>
              )}
              {result.language && (
                <div className="text-xs text-gray-500">
                  Language: {result.language}
                </div>
              )}
            </button>
          ))}
        </div>
      );
    }

    if (searchQuery.trim() && !isLoadingBdrc) {
      return (
        <div className="w-full bg-white border border-gray-300 rounded-md shadow-lg p-4">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 -mx-4 -mt-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700">BDRC Results</h3>
          </div>
          <p className="text-sm text-gray-600">No BDRC texts found</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-8">
      <ErrorDisplay error={error} />

      {/* BDRC Search Section */}
      <div className="space-y-4">
        <label
          htmlFor="bdrc-search"
          className="block text-sm font-medium text-gray-700"
        >
          Search BDRC by Title or ID
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="bdrc-search"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowBdrcResults(true);
              setShowTitleResults(true);
            }}
            placeholder="Search BDRC texts..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Search Results */}
        {(showTitleResults || showBdrcResults) && searchQuery && (
          <div className="relative space-y-2">
            {/* Title Search Results - shown first */}
            {showTitleResults && renderTitleSearchResults()}
            
            {/* BDRC Search Results - shown below title results */}
            {showBdrcResults && renderBdrcSearchResults()}
          </div>
        )}

        {/* Checking Text Status */}
        {(isCheckingBdrcText || isCheckingTitleText) && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <svg
                className="animate-spin h-5 w-5 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Checking if text exists...</span>
            </div>
          </div>
        )}

        {/* BDRC Text Not Found Message */}
        {bdrcTextNotFound && selectedBdrcResult && !isCheckingBdrcText && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 mb-2">
                  Text not found in catalog
                </p>
                <p className="text-sm text-yellow-700 mb-3">
                  The text "
                  {selectedBdrcResult.title || selectedBdrcResult.workId}" (ID:{" "}
                  {selectedBdrcResult.workId}) is not present in the catalog.
                </p>
                <a
                  href={catalogerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
                >
                  Create text on cataloger
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Text Information */}
      {selectedTextId && selectedInstanceId && processedText && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="space-y-2">
            <p className="text-sm font-medium text-green-800">
              Text loaded successfully
            </p>
            {selectedText && (
              <div className="text-sm text-green-700">
                <p>
                  <span className="font-medium">Text ID:</span> {selectedTextId}
                </p>
                <p>
                  <span className="font-medium">Instance ID:</span>{" "}
                  {selectedInstanceId}
                </p>
                <p>
                  <span className="font-medium">Content length:</span>{" "}
                  {processedText.length} characters
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {hasValidContent && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleCreateTranslation}
            disabled={isCreating}
            className="px-8 py-2 bg-secondary-600 hover:bg-secondary-700 text-white transition-colors"
          >
            {isCreating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Translation...
              </div>
            ) : (
              "Create Translation from OpenPecha"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
