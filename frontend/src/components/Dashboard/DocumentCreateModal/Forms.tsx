import React, { useState } from "react";
import SelectLanguage from "./SelectLanguage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import TextUploader from "./TextUploader";
import MetaDataInput from "./MetaDataInput";
import { createProject } from "@/api/project";
import { OpenPechaTextLoader } from "./OpenPechaTextLoader";
import { ErrorDisplay, FormSection } from "@/components/shared/modals";
import { DEFAULT_LANGUAGE_SELECTED } from "@/config";
import { useTranslate } from "@tolgee/react";

export type SelectedPechaType = {
	id: string;
	type: string;
	language: string;
	title: string;
};

export function NewPechaForm({
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
	const [selectedLanguage, setSelectedLanguage] = useState<string>(
		DEFAULT_LANGUAGE_SELECTED,
	);
	const [rootId, setRootId] = useState<string | null>(null);
	const [metadata, setMetadata] = useState<Record<string, unknown> | null>(
		null,
	);
	const queryClient = useQueryClient();
	const { t } = useTranslate();

	// Notify parent about validation state
	const isValid = !!(rootId && selectedLanguage && selectedLanguage !== "");

	React.useEffect(() => {
		onValidationChange?.(isValid);
	}, [isValid, onValidationChange]);

	const createProjectMutation = useMutation({
		mutationFn: () => {
			if (!projectName) {
				throw new Error("Project name is required");
			}
			return createProject({
				name: projectName,
				identifier: projectName.toLowerCase().replace(/\s+/g, "-"),
				rootId: rootId ?? undefined,
				metadata: metadata ?? undefined,
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

	const handleCreateProject = React.useCallback(() => {
		if (!projectName) {
			setError("Project name is required");
			return;
		}
		setError(""); // Clear any previous errors
		createProjectMutation.mutate();
	}, [projectName, createProjectMutation]);

	// Expose the create function to parent
	React.useEffect(() => {
		if (onCreateProject) {
			// Replace the onCreateProject prop with our handleCreateProject
			(onCreateProject as React.MutableRefObject<(() => void) | null>).current =
				handleCreateProject;
		}
	}, [handleCreateProject, onCreateProject]);

	return (
		<div className="space-y-8">
			<ErrorDisplay error={error} />
			<SelectLanguage
				setSelectedLanguage={setSelectedLanguage}
				selectedLanguage={selectedLanguage}
			/>

			{selectedLanguage && (
				<>
					<TextUploader
						isRoot={true}
						isPublic={false}
						selectedLanguage={selectedLanguage}
						setRootId={setRootId}
						disable={!selectedLanguage || selectedLanguage === ""}
					/>

					{rootId && (
						<FormSection
							title={t("projects.additionalInformation")}
							description={t("projects.ExtraMetadata")}
						>
							<MetaDataInput
								setMetadata={setMetadata}
								disable={
									!rootId || !selectedLanguage || selectedLanguage === ""
								}
							/>
						</FormSection>
					)}
				</>
			)}
		</div>
	);
}

export function PechaFromOpenPecha({
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
	return (
		<OpenPechaTextLoader
			projectName={projectName}
			closeModal={closeModal}
			onValidationChange={onValidationChange}
			onCreateProject={onCreateProject}
		/>
	);
}
