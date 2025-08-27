import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle, Languages, Loader2 } from "lucide-react";
import { createDocument, createDocumentWithContent } from "@/api/document";
import { fetchExpressions, fetchManifestations, fetchTextContent } from "@/api/pecha";
import { SearchableDropdown } from "../Dashboard/DocumentCreateModal/SearchableDropdown";
import {
  ErrorDisplay,
} from "@/components/shared/modals";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { QueryObserverResult } from "@tanstack/react-query";

// Types for OpenPecha data structures
interface Expression {
  id: string;
  title: string | { bo?: string; en?: string; [key: string]: string | undefined };
  alt_title?: string[];
  language: string;
}

interface Manifestation {
  id: string;
  expression_id: string;
  annotation: {[key: string]: unknown};
  type: string;
}

interface TextContentType {
  annotations: {
    [key: string]: Array<{[key: string]: unknown}>;
  };
  base: string;
}

export function OpenPechaTranslationLoader({
  rootId,
  onSuccess,
  refetchTranslations,
}: {
  readonly rootId: string;
  readonly onSuccess: (id: string) => void;
  readonly refetchTranslations: () => Promise<QueryObserverResult<unknown, Error>>;
}) {
  // State management
  const [error, setError] = useState("");
  const [selectedExpressionId, setSelectedExpressionId] = useState("");
  const [selectedManifestationId, setSelectedManifestationId] = useState("");
  const [selectedSegmentationId, setSelectedSegmentationId] = useState("");
  const [processedText, setProcessedText] = useState("");
  const [segmentationData, setSegmentationData] = useState<Array<{[key: string]: unknown}> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Utility function to extract title from title object or string
  const extractTitle = (title: string | { bo?: string; en?: string; [key: string]: string | undefined } | undefined, fallback: string = ""): string => {
    if (typeof title === 'string') return title;
    if (!title) return fallback;
    return title.bo ?? title.en ?? title[Object.keys(title)[0]] ?? fallback;
  };

  // API queries
  const {
    data: expressions = [],
    isLoading: expressionsLoading,
    error: expressionsError,
  } = useQuery({
    queryKey: ["expressions"],
    queryFn: () => fetchExpressions(),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: manifestations = [],
    isLoading: manifestationsLoading,
    error: manifestationsError,
  } = useQuery({
    queryKey: ["manifestations", selectedExpressionId],
    queryFn: () => fetchManifestations(selectedExpressionId),
    enabled: !!selectedExpressionId,
    staleTime: 5 * 60 * 1000,
  });
  
  const {
    data: textContent,
    isLoading: textContentLoading,
    error: textContentError,
  } = useQuery<TextContentType>({
    queryKey: ["textContent", selectedManifestationId],
    queryFn: () => fetchTextContent(selectedManifestationId),
    enabled: !!selectedManifestationId,
    staleTime: 5 * 60 * 1000,
  });

  // reset data flow when expression changes
  useEffect(() => {
    setSelectedManifestationId("");
    setSelectedSegmentationId("");
    setProcessedText("");
    setSegmentationData(null);
  }, [selectedExpressionId]);

  // Auto-select first manifestation when manifestations load
  useEffect(() => {
    if (manifestations.length > 0 && !selectedManifestationId) {
      setSelectedManifestationId(manifestations[0].id);
    }
  }, [manifestations, selectedManifestationId]);

  // Auto-select first segmentation option
  useEffect(() => {
    const hasSegmentation = manifestations.some(item =>
        item.annotation.some(a => a.type === "segmentation")
      );
    if (manifestations.length > 0 && hasSegmentation) {  
      setSelectedSegmentationId(manifestations[0].annotation[0].id);
    }else{
        setSelectedSegmentationId("");
    }
  }, [manifestations, selectedManifestationId, selectedSegmentationId]);

  // Process text based on selected segmentation
  useEffect(() => {
    if (!textContent || !selectedSegmentationId) {
      setProcessedText(textContent?.base || "");
      setSegmentationData(null);
      return;
    }

    const selectedSegmentation = textContent.annotations?.segmentation[selectedSegmentationId];
    if (!selectedSegmentation || !Array.isArray(selectedSegmentation)) {
      setProcessedText(textContent.base || "");
      setSegmentationData(null);
      return;
    }

    try {
      // Process segmented text
      const segments = selectedSegmentation.map((seg, index) => {
        if (seg.Span && typeof seg.Span.start === 'number' && typeof seg.Span.end === 'number') {
          const segmentText = textContent.base
            .substring(seg.Span.start, seg.Span.end)
            .replace(/\n/g, "");
          return {
            id: seg.id || `segment_${index}`,
            text: segmentText,
            start: seg.Span.start,
            end: seg.Span.end,
            mapping: seg.root_idx_mapping || index + 1,
          };
        }
        return null;
      }).filter(Boolean);

      const segmentedText = segments.map(seg => seg?.text).join('\n');
      setProcessedText(segmentedText);
      setSegmentationData({
        type: selectedSegmentationId,
        segments: segments,
      });
    } catch (err) {
      console.error('Error processing segmentation:', err);
      setProcessedText(textContent.base || "");
      setSegmentationData(null);
    }
  }, [textContent, selectedSegmentationId]);

  // Create translation mutation
  const createTranslationMutation = useMutation({
    mutationFn: async () => {
      if (!processedText.trim()) {
        throw new Error("No text content available");
      }

      if (!selectedExpressionId) {
        throw new Error("Please select an expression");
      }

      if (!selectedManifestationId) {
        throw new Error("Please select a manifestation");
      }

      // Create the translation document
      const formData = new FormData();
      const selectedExpression = expressions.find((exp: Expression) => exp.id === selectedExpressionId);
      const documentName = extractTitle(selectedExpression?.title);
      const uniqueIdentifier = `${documentName}-${Date.now()}`;

      formData.append("name", documentName);
      formData.append("identifier", uniqueIdentifier);
      formData.append("isRoot", "false");
      formData.append("isPublic", "false");
      formData.append("language", selectedExpression.language);
      formData.append("rootId", rootId);
      formData.append("content", processedText);
      formData.append("metadata", JSON.stringify({
        openpecha: {
          expression_id: selectedExpressionId,
          manifestation_id: selectedManifestationId,
          ...(selectedSegmentationId ? { segmentation_type: selectedSegmentationId } : {})
        }
      }));
      console.log("formData :::", Object.fromEntries(formData));
      return createDocumentWithContent(formData);
    },
    onSuccess: (response) => {
      console.log("OpenPecha translation created successfully:", response);
      setIsCreating(false);
      onSuccess(response.id);
      refetchTranslations?.();
    },
    onError: (error: Error) => {
      console.error("Error creating OpenPecha translation:", error);
      setError(error.message || "Failed to create OpenPecha translation");
      setIsCreating(false);
    },
  });

  const handleCreateTranslation = () => {
    if (!selectedExpressionId) {
      setError("Please select an expression");
      return;
    }
    if (!selectedManifestationId) {
      setError("Please select a manifestation");
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

  // Prepare dropdown options
  const expressionOptions = expressions.map((exp: Expression) => ({
    value: exp.id,
    label: extractTitle(exp.title, exp.id),
    subtitle: `${exp.language} • ${exp.id}`,
  }));

  const manifestationOptions = manifestations.map((manifest: Manifestation) => ({
    value: manifest.id,
    label: `${manifest.id} (${manifest.type})`,
  }));

  const segmentationOptions = manifestations.flatMap(item =>
  item.annotation
    .filter(a => a.type === "segmentation")
    .map(a => ({
      value: a.id,
      label: a.id
    }))
 );

  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).length;
  };

  const getLineCount = (text: string): number => {
    return text.split("\n").length;
  };

  const hasValidContent = !!(
    selectedExpressionId && 
    selectedManifestationId && 
    processedText.trim()
  );

  return (
    <div className="space-y-8">
      <ErrorDisplay error={error} />

      {/* Expression Selection */}
        <SearchableDropdown
          label="Pecha"
          placeholder="Search and select a pecha..."
          options={expressionOptions}
          value={selectedExpressionId}
          onChange={setSelectedExpressionId}
          loading={expressionsLoading}
          error={expressionsError?.message}
        />

      {/* Manifestation Selection */}
      <div className="flex gap-4">
      {selectedExpressionId && (
        <div className="flex-1">
          <SearchableDropdown
            label="Version"
            placeholder="Select a version..."
            options={manifestationOptions}
            value={selectedManifestationId}
            onChange={setSelectedManifestationId}
            loading={manifestationsLoading}
            error={manifestationsError?.message}
          />
          </div>
      )}

      {/* Segmentation Selection */}
      {selectedManifestationId && segmentationOptions.length > 0 && (
        <div className="flex-1">
          <SearchableDropdown
            label="Segmentation Type"
            placeholder="Select segmentation..."
            options={segmentationOptions}
            value={selectedSegmentationId}
            onChange={setSelectedSegmentationId}
          />
          </div>
      )}

     {selectedExpressionId && selectedManifestationId && segmentationOptions.length === 0 && (
        <div className="flex flex-1 flex-col space-y-2">
            <Label className="text-sm font-medium text-gray-700">Segmentation Type</Label>
            <p className="flex flex-1 text-sm text-red-500 items-center">No segmentation available</p>
        </div>
      )}
      </div>

      {/* Text Preview */}
      {selectedManifestationId && (
        <>
          {textContentLoading ? (
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading text content...</span>
                </div>
              </CardContent>
            </Card>
          ) : textContentError ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>Error loading text: {textContentError.message}</span>
                </div>
              </CardContent>
            </Card>
          ) : processedText ? (
            <div className="space-y-1">

              {/* Content Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Content Preview</h3>
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Content loaded</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-blue-900">
                          {extractTitle(
                            expressions.find((exp: Expression) => exp.id === selectedExpressionId)?.title,
                            selectedExpressionId
                          )}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {segmentationData ? 'Segmented' : 'Full Text'}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-blue-700">
                        <div className="flex items-center gap-1">
                          <Languages className="h-4 w-4" />
                          <span>Language: {expressions.find((exp: Expression) => exp.id === selectedExpressionId)?.language}</span>
                        </div>
                        <div>Words: {getWordCount(processedText)}</div>
                        <div>Lines: {getLineCount(processedText)}</div>
                        {segmentationData && (
                          <div>Segments: {segmentationData.segments.length}</div>
                        )}
                      </div>
                    </div>

                <Textarea
                  value={processedText}
                  rows={12}
                  readOnly
                  className="font-monlam resize-none border-gray-300 bg-gray-50 text-sm leading-relaxed"
                  placeholder="Processed text will appear here..."
                />
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-500">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                  <p>No text content available</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Create Translation Button */}
      {hasValidContent && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleCreateTranslation}
            disabled={isCreating}
            className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white transition-colors"
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
