import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CardContent } from "@/components/ui/card";
import { AlertCircle, BookOpen, Loader2 } from "lucide-react";
import { fetchTemplates } from "@/api/pecha";
import { createProject } from "@/api/project";
import { createDocumentWithContent } from "@/api/document";
import { MAX_TEMPLATES } from "@/utils/Constants";
import { useTranslation } from "react-i18next";
// Types for OpenPecha data structures
interface TemplateData {
	expression_id: string;
	manifest_id: string;
	title: string;
	text_content: string;
}

const ProjectTemplates = () => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);
	const { t } = useTranslation();

	// Fetch templates using the new single endpoint
	const {
		data: templateData = [],
		isLoading: isLoadingTemplates,
		error: templatesError,
	} = useQuery({
		queryKey: ["templates", MAX_TEMPLATES],
		queryFn: () => fetchTemplates(MAX_TEMPLATES),
		staleTime: 60 * 60 * 1000, // Cache for 1 hour
	});
	// Create project mutation

	const createProjectMutation = useMutation({
		mutationFn: async (template: TemplateData) => {
			const projectName = template.title;

			// First create the document with the processed text
			const formData = new FormData();
			const documentName =
				template.title || `OpenPecha-${template.expression_id}`;
			const uniqueIdentifier = `${documentName}-${Date.now()}`;

			formData.append("name", documentName);
			formData.append("identifier", uniqueIdentifier);
			formData.append("isRoot", "true");
			formData.append("language", "tibetan");
			formData.append("content", template.text_content);
			formData.append(
				"metadata",
				JSON.stringify({
					openpecha: {
						expression_id: template.expression_id,
						manifestation_id: template.manifest_id,
						template: true,
					},
				}),
			);

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
					expression_id: template.expression_id,
					manifestation_id: template.manifest_id,
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
		setCreatingTemplateId(template.expression_id);
		createProjectMutation.mutate(template);
	};

	const truncateText = (text: string, maxLength: number = 350): string => {
		if (text?.length <= maxLength) return text;
		return text?.substring(0, maxLength).trim() + "...";
	};

	if (isLoadingTemplates) {
		return (
			<div className="space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
					{Array.from({ length: MAX_TEMPLATES }).map((_, index) => (
						<div
							key={index}
							className="flex flex-col gap-6  border py-3 shadow-sm bg-neutral-50 dark:bg-neutral-700 animate-pulse"
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

	if (templatesError) {
		return (
			<div className="flex items-center justify-center py-8">
				<AlertCircle className="h-5 w-5 text-red-500 mr-2" />
				<span className="text-red-600">
					{t("template.failedToLoadTemplates", "Failed to load templates")}
				</span>
			</div>
		);
	}

	if (!isLoadingTemplates && templateData?.length === 0) {
		return null;
	}

	return (
		<div className="flex gap-4 h-full">
			{templateData?.map((template: TemplateData) => {
				const isCreating = creatingTemplateId === template.expression_id;
				const alternativeTitle = template?.metadata?.alternative_title;
				const card_title =
					alternativeTitle.length > 0
						? JSON.stringify(alternativeTitle)
						: template.title;

				return (
					<div
						title={JSON.stringify(card_title)}
						key={template.expression_id}
						className="flex-shrink-0 cursor-pointer group"
						onClick={() => !isCreating && handleTemplateClick(template)}
						style={{ width: "180px" }}
					>
						<div className="space-y-2">
							<div
								className={`border border-border/50 hover:shadow-lg transition-all duration-300 overflow-hidden h-[180px]  bg-neutral-50 dark:bg-neutral-700 ${
									isCreating ? "opacity-75 pointer-events-none" : ""
								}`}
							>
								<div className="px-4 pt-6 h-full flex justify-center bg-gradient-to-br from-secondary/30 to-muted/30">
									<div className=" w-full text-center space-y-3">
										<div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
											TEXT
										</div>
										<div className="text-[10px] leading-[normal] font-monlam text-foreground/80 line-clamp-4 px-2">
											{truncateText(template.text_content, 2000)}
										</div>
										{isCreating && (
											<Loader2 className="h-4 w-4 animate-spin text-secondary-500 mx-auto" />
										)}
									</div>
								</div>
							</div>
							<div className="space-y-0.5 px-1" title={template.title}>
								<span className="text-md truncate text-foreground font-light font-monlam-2 line-clamp-1">
									{template.title}
								</span>
								<span className="text-xs text-muted-foreground block">
									{template.metadata.type} - {template.metadata.language}
								</span>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
};

export default ProjectTemplates;
