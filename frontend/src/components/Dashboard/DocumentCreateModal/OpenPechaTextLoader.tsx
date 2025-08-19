import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle, FileText, Languages, Loader2 } from "lucide-react";
import { createProject } from "@/api/project";
import { createDocumentWithContent } from "@/api/document";
import { fetchExpressions, fetchManifestations, fetchTextContent } from "@/api/pecha";
import { SearchableDropdown } from "./SearchableDropdown";
import {
  ErrorDisplay,
  ModalFooter,
  FormSection,
} from "@/components/shared/modals";

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
  annotation: any;
  type: string;
}

interface TextContentType {
  annotations: {
    [key: string]: any[];
  };
  base: string;
}

export function OpenPechaTextLoader({
  projectName,
  closeModal,
}: {
  readonly projectName: string;
  readonly closeModal: () => void;
}) {
  // State management
  const [error, setError] = useState("");
  const [selectedExpressionId, setSelectedExpressionId] = useState("");
  const [selectedManifestationId, setSelectedManifestationId] = useState("");
  const [selectedSegmentationId, setSelectedSegmentationId] = useState("");
  const [processedText, setProcessedText] = useState("");
  const [segmentationData, setSegmentationData] = useState<any>(null);

  const queryClient = useQueryClient();

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
        console.log("no textContent or segmentation")
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
        originalText: textContent.base,
      });
    } catch (err) {
      console.error('Error processing segmentation:', err);
      setProcessedText(textContent.base || "");
      setSegmentationData(null);
    }
  }, [textContent, selectedSegmentationId]);

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
      const selectedExpression = expressions.find((exp: Expression) => exp.id === selectedExpressionId);
      const documentName = extractTitle(selectedExpression?.title, `OpenPecha-${selectedExpressionId}`);
      const uniqueIdentifier = `${documentName}-${Date.now()}`;

      formData.append("name", documentName);
      formData.append("identifier", uniqueIdentifier);
      formData.append("isRoot", "true");
      formData.append("language", selectedExpression?.language || "tibetan");
      formData.append("content", processedText);

      // Add segmentation metadata if available
      if (segmentationData) {
        formData.append("metadata", JSON.stringify({
          openpecha: {
            expression_id: selectedExpressionId,
            manifestation_id: selectedManifestationId,
            segmentation_type: selectedSegmentationId,
            segmentation_data: segmentationData,
          }
        }));
      }

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
          expression_id: selectedExpressionId,
          manifestation_id: selectedManifestationId,
          segmentation_type: selectedSegmentationId,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      closeModal();
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to create project");
    },
  });

  const handleCreateProject = () => {
    if (!projectName) {
      setError("Project name is required");
      return;
    }
    if (!selectedExpressionId) {
      setError("Please select an expression");
      return;
    }
    if (!selectedManifestationId) {
      setError("Please select a manifestation");
      return;
    }
    setError("");
    createProjectMutation.mutate();
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

  return (
    <div className="space-y-8">
      <ErrorDisplay error={error} />

      {/* Expression Selection */}
      <FormSection
        title="Select Pecha"
        description="Choose a pecha from the OpenPecha library"
      >
        <SearchableDropdown
          label="Pecha"
          placeholder="Search and select a pecha..."
          options={expressionOptions}
          value={selectedExpressionId}
          onChange={setSelectedExpressionId}
          loading={expressionsLoading}
          error={expressionsError?.message}
        />
      </FormSection>

      {/* Manifestation Selection */}
      {selectedExpressionId && (
        <FormSection
          title="Select Version"
          description="Choose a specific version of the selected pecha"
        >
          <SearchableDropdown
            label="Version"
            placeholder="Select a version..."
            options={manifestationOptions}
            value={selectedManifestationId}
            onChange={setSelectedManifestationId}
            loading={manifestationsLoading}
            error={manifestationsError?.message}
          />
        </FormSection>
      )}

      {/* Segmentation Selection */}
      {selectedManifestationId && segmentationOptions.length > 0 && (
        <FormSection
          title="Select Segmentation"
          description="Choose how the text should be segmented for translation"
        >
          <SearchableDropdown
            label="Segmentation Type"
            placeholder="Select segmentation..."
            options={segmentationOptions}
            value={selectedSegmentationId}
            onChange={setSelectedSegmentationId}
          />
        </FormSection>
      )}
      {selectedExpressionId && selectedManifestationId && segmentationOptions.length === 0 && (
        <FormSection
          title="No Segmentation"
          description="No segmentation available for this version, loading first alignment"
        >
            <p> </p>
        </FormSection>
      )}

      {/* Text Preview */}
      {selectedManifestationId && (
        <FormSection
          title="Text Preview"
          description="Preview of the loaded text content"
        >
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
              {/* Text Information */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="py-2">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <FileText className="h-8 w-8 text-blue-600" />
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
                  </div>
                </CardContent>
              </Card>

              {/* Content Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Content Preview</h3>
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Content loaded</span>
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
        </FormSection>
      )}

      {/* Action Buttons */}
      <ModalFooter
        onCancel={closeModal}
        onConfirm={handleCreateProject}
        confirmDisabled={
          !selectedExpressionId || 
          !selectedManifestationId || 
          !processedText.trim() ||
          !projectName.trim()
        }
        confirmLoading={createProjectMutation.isPending}
        confirmText="Create Project"
      />
    </div>
  );
}
