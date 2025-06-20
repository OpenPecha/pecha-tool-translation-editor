import { useState } from "react";
import SelectLanguage from "./SelectLanguage";
import SelectPechas, { PechaType } from "./SelectPechas";
import { DialogFooter } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import TextUploader from "./TextUploader";
import MetaDataInput from "./MetaDataInput";
import { createProject } from "@/api/project";
import { Button } from "@/components/ui/button";
import { useMatomo } from "@datapunt/matomo-tracker-react";

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
  const [metadata, setMetadata] = useState<Json | null>(null);
  const queryClient = useQueryClient();
  const { trackEvent } = useMatomo();
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
    onSuccess: (data) => {
      // Invalidate and refetch projects query
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      // Close modal and reset form
      closeModal();
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to create project");
    },
  });

  const handleCreateProject = () => {
    //send event
    trackEvent({
      category: "submission",
      action: "create",
      name: "create-project", // optional
      documentTitle: document.title, // optional
      href: window.location.href, // optional
    });

    if (!rootId) {
      setError("Root document is required");
      return;
    }

    if (!projectName) {
      setError("Project name is required");
      return;
    }
    createProjectMutation.mutate();
  };

  return (
    <div className="p-4">
      {error != "" && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <ScrollArea className="h-[50dvh] ">
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
            <MetaDataInput
              setMetadata={setMetadata}
              disable={!rootId || !selectedLanguage || selectedLanguage === ""}
            />
          </>
        )}
      </ScrollArea>
      <DocumentCreateModalFooter
        createDoc={handleCreateProject}
        closeModal={closeModal}
        disable={!rootId || !selectedLanguage || selectedLanguage === ""}
      />
    </div>
  );
}

export function PechaFromOpenPecha({
  closeModal,
}: {
  readonly closeModal: () => void;
}) {
  const [selectedRootPecha, setSelectedRootPecha] = useState<string | null>(
    null
  );
  //selected datas

  return (
    <div className="p-4">
      <SelectPechas
        selectedPecha={selectedRootPecha}
        setSelectedPecha={setSelectedRootPecha}
      />
      <DocumentCreateModalFooter
        createDoc={() => {}}
        closeModal={closeModal}
        disable={true}
      />
    </div>
  );
}

function DocumentCreateModalFooter({
  createDoc,
  closeModal,
  disable,
}: {
  readonly createDoc: () => void;
  readonly closeModal: () => void;
  readonly disable: boolean;
}) {
  return (
    <DialogFooter className="flex w-full sm:justify-between">
      <Button
        type="button"
        variant="ghost"
        className="px-4 py-2  text-gray-700 rounded cursor-pointer"
        onClick={closeModal}
      >
        Cancel
      </Button>
      <Button
        type="button"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
        onClick={createDoc}
        disabled={disable}
      >
        Create
      </Button>
    </DialogFooter>
  );
}
