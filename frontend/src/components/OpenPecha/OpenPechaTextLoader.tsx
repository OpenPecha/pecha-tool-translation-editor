import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProject } from "@/api/project";
import { createDocumentWithContent } from "@/api/document";
import { ErrorDisplay } from "@/components/shared/modals";
import { useBdrcSearch, BdrcSearchResult } from "@/hooks/uesBDRC";
import { Search, AlertCircle, ExternalLink } from "lucide-react";
import {
  fetchInstances,
  fetchText,
  fetchTextContent,
  fetchAnnotations,
} from "@/api/openpecha";

export function OpenPechaTextLoader({
  projectName,
  closeModal,
  onValidationChange,
  onCreateProject,
}: {
  readonly projectName: string;
  readonly closeModal: () => void;
  readonly onValidationChange?: (isValid: boolean) => void;
  readonly onCreateProject?: React.MutableRefObject<(() => void) | null>;
}) {
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const [bdrcSearchQuery, setBdrcSearchQuery] = useState("");
  const [showBdrcResults, setShowBdrcResults] = useState(false);
  const [selectedBdrcResult, setSelectedBdrcResult] =
    useState<BdrcSearchResult | null>(null);
  const [isCheckingBdrcText, setIsCheckingBdrcText] = useState(false);
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
  } = useBdrcSearch(bdrcSearchQuery, "Instance", 1000);

  // Validation state
  const isValid = !!(
    selectedTextId &&
    selectedInstanceId &&
    processedText.trim() &&
    projectName.trim()
  );

  // Notify parent about validation state
  React.useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (!projectName) {
        throw new Error("Project name is required");
      }

      if (!processedText.trim()) {
        throw new Error("No text content available");
      }

      // First create the document with the processed text
      const formData = new FormData();
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
      const documentName = extractTitle(
        selectedText?.title,
        `OpenPecha-${selectedTextId}`
      );
      const uniqueIdentifier = `${documentName}-${Date.now()}`;

      formData.append("name", documentName);
      formData.append("identifier", uniqueIdentifier);
      formData.append("isRoot", "true");
      formData.append("language", selectedText?.language || "tibetan");
      formData.append("content", processedText);
      formData.append(
        "metadata",
        JSON.stringify({
          text_id: selectedTextId,
          instance_id: selectedInstanceId,
        })
      );

      const documentResponse = await createDocumentWithContent(formData);

      if (!documentResponse?.id) {
        throw new Error("Failed to create document");
      }

      // Then create the project with the document as root
      return createProject({
        name: projectName,
        identifier: projectName.toLowerCase().replace(/\s+/g, "-"),
        rootId: documentResponse.id,
        metadata: {
          source: "openpecha",
          text_id: selectedTextId,
          instance_id: selectedInstanceId,
        },
      });
    },
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      closeModal();
      const rootId = data.roots[0].id;
      window.location.href = `/documents/${rootId}`;
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to create project");
    },
  });

  const handleCreateProject = React.useCallback(() => {
    if (!projectName) {
      setError("Project name is required");
      return;
    }

    setError("");
    createProjectMutation.mutate();
  }, [projectName, createProjectMutation]);

  // Expose the create function to parent
  React.useEffect(() => {
    if (onCreateProject) {
      (onCreateProject as React.MutableRefObject<(() => void) | null>).current =
        handleCreateProject;
    }
  }, [handleCreateProject, onCreateProject]);

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

  // Cataloger URL
  const CATALOGER_URL =
    import.meta.env.VITE_CATALOGER_FRONTEND_URL || "http://localhost:8000";
  const catalogerUrl = React.useMemo(() => {
    const workIdParam = selectedBdrcResult?.workId
      ? `create?w_id=${selectedBdrcResult.workId}&i_id=${selectedBdrcResult.instanceId}`
      : "";
    return `${CATALOGER_URL}/${workIdParam}`;
  }, [CATALOGER_URL, selectedBdrcResult?.workId]);

  // Render BDRC search results
  const renderBdrcSearchResults = () => {
    if (isLoadingBdrc) {
      return (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4">
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
        <div className="absolute z-10 w-full mt-1 bg-white border border-red-300 rounded-md shadow-lg p-4">
          <p className="text-sm text-red-600">
            Error searching BDRC: {bdrcError}
          </p>
        </div>
      );
    }

    if (bdrcResults.length > 0) {
      return (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
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

    if (bdrcSearchQuery.trim()) {
      return (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4">
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
            value={bdrcSearchQuery}
            onChange={(e) => {
              setBdrcSearchQuery(e.target.value);
              setShowBdrcResults(true);
            }}
            placeholder="Search BDRC texts..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* BDRC Search Results */}
        {showBdrcResults && bdrcSearchQuery && (
          <div className="relative bdrc-results-container">
            {renderBdrcSearchResults()}
          </div>
        )}

        {/* Checking BDRC Text Status */}
        {isCheckingBdrcText && (
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
    </div>
  );
}
