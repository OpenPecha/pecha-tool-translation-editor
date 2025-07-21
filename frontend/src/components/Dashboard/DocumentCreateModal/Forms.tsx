import { useState } from "react";
import SelectLanguage from "./SelectLanguage";
import SelectPechas from "./SelectPechas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import TextUploader from "./TextUploader";
import MetaDataInput from "./MetaDataInput";
import { createProject } from "@/api/project";
import PechaView from "./PechaView";
import {
  ErrorDisplay,
  ModalFooter,
  FormSection,
} from "@/components/shared/modals";

export type SelectedPechaType = {
  id: string;
  type: string;
  language: string;
  title: string;
};

export function NewPechaForm({
  projectName,
  closeModal,
}: {
  readonly projectName: string;
  readonly closeModal: () => void;
}) {
  const [error, setError] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [rootId, setRootId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(
    null
  );
  const queryClient = useQueryClient();

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

  const handleCreateProject = () => {
    if (!projectName) {
      setError("Project name is required");
      return;
    }
    setError(""); // Clear any previous errors
    createProjectMutation.mutate();
  };

  return (
    <div className="space-y-8">
      <ErrorDisplay error={error} />

      <FormSection
        title="Language Selection"
        description="Choose the primary language for your document"
      >
        <SelectLanguage
          setSelectedLanguage={setSelectedLanguage}
          selectedLanguage={selectedLanguage}
        />
      </FormSection>

      {selectedLanguage && (
        <>
          <FormSection
            title="Document Upload"
            description="Upload your document file to create the project"
          >
            <TextUploader
              isRoot={true}
              isPublic={false}
              selectedLanguage={selectedLanguage}
              setRootId={setRootId}
              disable={!selectedLanguage || selectedLanguage === ""}
            />
          </FormSection>

          {rootId && (
            <FormSection
              title="Additional Information"
              description="Provide extra metadata for your document (optional)"
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

      <ModalFooter
        onCancel={closeModal}
        onConfirm={handleCreateProject}
        confirmDisabled={
          !rootId || !selectedLanguage || selectedLanguage === ""
        }
        confirmLoading={createProjectMutation.isPending}
      />
    </div>
  );
}

export function PechaFromOpenPecha({
  projectName,
  closeModal,
}: {
  readonly projectName: string;
  readonly closeModal: () => void;
}) {
  const [selectedPecha, setSelectedPecha] = useState<SelectedPechaType | null>(
    null
  );
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const createProjectMutation = useMutation({
    mutationFn: ({ rootId }: { rootId: string }) => {
      if (!projectName) {
        throw new Error("Project name is required");
      }

      return createProject({
        name: projectName,
        identifier: projectName.toLowerCase().replace(/\s+/g, "-"),
        rootId: rootId,
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

  const handleCreateProject = (rootId: string) => {
    if (!projectName) {
      setError("Project name is required");
      return;
    }
    setError(""); // Clear any previous errors
    createProjectMutation.mutate({ rootId });
  };

  return (
    <div className="space-y-8">
      <ErrorDisplay error={error} />

      <FormSection
        title="OpenPecha Selection"
        description="Select a pecha from the OpenPecha library"
      >
        <SelectPechas
          selectedPecha={selectedPecha}
          setSelectedPecha={setSelectedPecha}
        />
      </FormSection>

      {selectedPecha?.id && (
        <FormSection
          title="Preview & Confirm"
          description="Review the selected pecha before creating your project"
        >
          <PechaView
            isRoot={true}
            selectedPecha={selectedPecha}
            closeModal={closeModal}
            handleCreateProject={handleCreateProject}
          />
        </FormSection>
      )}
    </div>
  );
}
