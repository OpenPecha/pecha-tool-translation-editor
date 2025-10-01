import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CardContent } from "@/components/ui/card";
import { AlertCircle, BookOpen, Loader2 } from "lucide-react";
import { fetchExpressions, fetchManifestations, fetchTextContent } from "@/api/pecha";
import { createProject } from "@/api/project";
import { createDocumentWithContent } from "@/api/document";
import { MAX_TEMPLATES } from "@/utils/Constants";
import { useTranslation } from "react-i18next";
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

interface TemplateData {
  expression: Expression;
  manifestation: Manifestation;
  textContent: TextContentType;
  processedText: string;
}

const ProjectTemplates = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation(); 
  // Utility function to extract title from title object or string
  const extractTitle = (title: string | { bo?: string; en?: string; [key: string]: string | undefined } | undefined, fallback: string = ""): string => {
    if (typeof title === 'string') return title;
    if (!title) return fallback;
    return title.bo ?? title.en ?? title[Object.keys(title)[0]] ?? fallback;
  };

  // Fetch first four OpenPecha expressions
  const {
    data: expressions = [],
    isLoading: expressionsLoading,
    error: expressionsError,
    isStale: expressionsStale,
  } = useQuery({
    queryKey: ["template-expressions"],
    queryFn: () => fetchExpressions(),
    staleTime: 60 * 60 * 1000,
    select: (data) => data?.slice(0, MAX_TEMPLATES) || [], // Take only first MAX_TEMPLATES
  });

  // Always create exactly MAX_TEMPLATES queries to maintain hook order
  const someTemplates = expressions?.slice(0, MAX_TEMPLATES) || [];
  
  // Pad with null values to always have MAX_TEMPLATES items
  const paddedExpressions = [...someTemplates];
  while (paddedExpressions.length < MAX_TEMPLATES) {
    paddedExpressions.push(null);
  }

  // Fetch manifestations for each expression (always MAX_TEMPLATES queries)
  const manifestationQueries = paddedExpressions.map((expression, index) =>
    useQuery({
      queryKey: ["template-manifestations", expression?.id || `empty-${index}`],
      queryFn: () => expression ? fetchManifestations(expression.id) : Promise.resolve([]),
      enabled: !!expression?.id,
      staleTime: 5 * 60 * 1000,
      select: (data) => data?.[0], // Take first manifestation
    })
  );

  // Fetch text content for each manifestation (always MAX_TEMPLATES queries)
  const textContentQueries = manifestationQueries.map((manifestationQuery, index) =>
    useQuery({
      queryKey: ["template-text-content", manifestationQuery.data?.id || `empty-text-${index}`],
      queryFn: () => manifestationQuery.data?.id ? fetchTextContent(manifestationQuery.data.id) : Promise.resolve(null),
      enabled: !!manifestationQuery.data?.id,
      staleTime: 5 * 60 * 1000,
    })
  );

  // Check if any queries are still loading
  const isLoadingManifestations = manifestationQueries.some(query => query.isLoading);
  const isLoadingTextContent = textContentQueries.some(query => query.isLoading);
  const isLoadingTemplates = expressionsLoading || isLoadingManifestations || isLoadingTextContent;

  // Process template data - only process valid expressions
  const templateData: TemplateData[] = someTemplates
    .map((expression: Expression | null, index: number) => {
      if (!expression) return null;
      
      const manifestation = manifestationQueries[index]?.data;
      const textContent = textContentQueries[index]?.data;
      
      if (!manifestation || !textContent) return null;

      // Process text content (simplified version of the logic from OpenPechaTextLoader)
      let processedText = textContent.base || "";
      
      // Try to get segmented text if available
      const segmentationKeys = Object.keys(textContent.annotations?.segmentation || {});
      if (segmentationKeys.length > 0) {
        const firstSegmentation = textContent.annotations.segmentation[segmentationKeys[0]];
        if (Array.isArray(firstSegmentation)) {
          try {
            const segments = firstSegmentation
              .map((seg) => {
                if (seg.Span && typeof seg.Span.start === 'number' && typeof seg.Span.end === 'number') {
                  return textContent.base
                    .substring(seg.Span.start, seg.Span.end)
                    .replace(/\n/g, "");
                }
                return null;
              })
              .filter(Boolean);
            
            if (segments.length > 0) {
              processedText = segments.join('\n');
            }
          } catch (err) {
            console.error('Error processing segmentation:', err);
          }
        }
      }

      return {
        expression,
        manifestation,
        textContent,
        processedText,
      };
    })
    .filter(Boolean) as TemplateData[];

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (template: TemplateData) => {
      const projectName = `${extractTitle(template.expression.title)}`;
      
      // First create the document with the processed text
      const formData = new FormData();
      const documentName = extractTitle(template.expression.title, `OpenPecha-${template.expression.id}`);
      const uniqueIdentifier = `${documentName}-${Date.now()}`;

      formData.append("name", documentName);
      formData.append("identifier", uniqueIdentifier);
      formData.append("isRoot", "true");
      formData.append("language", template.expression.language || "tibetan");
      formData.append("content", template.processedText);
      formData.append("metadata", JSON.stringify({
        openpecha: {
          expression_id: template.expression.id,
          manifestation_id: template.manifestation.id,
          template: true,
        }
      }));

      const documentResponse = await createDocumentWithContent(formData);
      
      if (!documentResponse?.id) {
        throw new Error("Failed to create document");
      }

      // Then create the project with the document as root
      const projectResponse = await createProject({
        name: projectName,
        identifier: projectName.toLowerCase().replace(/\s+/g, "-"),
        rootId: documentResponse.id,
        metadata: {
          source: "openpecha-template",
          expression_id: template.expression.id,
          manifestation_id: template.manifestation.id,
          template: true,
        },
      });

      return { project: projectResponse, document: documentResponse };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      // Navigate to the editor with the created document
      navigate(`/documents/${data.document.id}`);
    },
    onError: (error: Error) => {
      console.error("Failed to create project from template:", error);
      setError(error.message || "Failed to create project from template");
    },
    onSettled: () => {
      setCreatingTemplateId(null);
    },
  });

  const handleTemplateClick = (template: TemplateData) => {
    setError(null); // Clear any previous errors
    setCreatingTemplateId(template.expression.id);
    createProjectMutation.mutate(template);
  };

  const truncateText = (text: string, maxLength: number = 350): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  if (isLoadingTemplates) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {Array.from({ length: MAX_TEMPLATES }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-6 rounded-xl border py-3 shadow-sm bg-neutral-50 dark:bg-neutral-700 animate-pulse"
            >
              <div className="px-4 flex flex-col h-full">
                {/* Header skeleton */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                </div>

                {/* Content skeleton */}
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-4/6"></div>
                  </div>
                  
                  {/* Stats skeleton */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600 mt-4">
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (expressionsError) {
    return (
      <div className="flex items-center justify-center py-8">
        <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
        <span className="text-red-600">{t("template.failedToLoadTemplates", "Failed to load templates")}</span>
      </div>
    );
  }

  if (!isLoadingTemplates && templateData.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">{t("template.noTemplatesAvailable", "No templates available at the moment")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {templateData.map((template) => {
          const isCreating = creatingTemplateId === template.expression.id;
          const title = extractTitle(template.expression.title, template.expression.id);
          
          return (
            <div
              key={template.expression.id}
              className={`flex flex-col h-full gap-6 rounded-xl border py-3 shadow-sm group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-secondary-400 dark:hover:border-secondary-600 bg-neutral-50 dark:bg-neutral-700 flex flex-col ${
                isCreating ? 'opacity-75 pointer-events-none' : ''
              }`}
              onClick={() => !isCreating && handleTemplateClick(template)}
            >
              <CardContent className="px-4 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className={`${template.expression.language === 'bo' ? 'font-monlam py-1' : 'font-google-sans'} font-medium text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-secondary-600 dark:group-hover:text-secondary-400 transition-colors`}>
                      {title}
                    </div>
                  </div>
                  {isCreating && (
                    <Loader2 className="h-4 w-4 animate-spin text-secondary-500 flex-shrink-0" />
                  )}
                </div>

                {/* Content Preview - Flexible height */}
                <div className="flex-1 flex flex-col justify-between h-full">
                    <p className={`text-[6px] text-gray-600 pb-1 dark:text-gray-400
                      ${template.expression.language === 'bo' ? 'font-monlam' : 'font-google-sans'}`}>
                    {truncateText(template.processedText, template.expression.language === 'en' ? 650 : 700)}
                  </p>
                </div>
                </CardContent>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectTemplates;
