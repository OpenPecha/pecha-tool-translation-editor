import React, { useEffect, useState } from "react";
import { QueryObserverResult, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { createDocument } from "@/api/document";
import SelectLanguage from "../Dashboard/DocumentCreateModal/SelectLanguage";
import TextUploader from "../Dashboard/DocumentCreateModal/TextUploader";
import { useTranslate } from "@tolgee/react";
import {
  BaseModal,
  UploadMethodTabs,
  TabContentWrapper,
  TextPreview,
  type UploadMethod,
} from "@/components/shared/modals";
import { OpenPechaTranslationLoader } from "./OpenPechaTranslationLoader";

interface CreateTranslationModalProps {
  rootId: string;
  onClose: () => void;
  refetchTranslations: () => Promise<QueryObserverResult<unknown, Error>>;
}

const CreateTranslationModal: React.FC<CreateTranslationModalProps> = ({
  rootId,
  onClose,
  refetchTranslations,
}) => {
  const [language, setLanguage] = useState<string>("");
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>("empty");
  const [translationId, setTranslationId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const { t } = useTranslate();

  useEffect(() => {
    if (translationId) {
      onClose();
    }
  }, [translationId, onClose]);

  const handleFileLoaded = (file: File, content: string) => {
    setUploadedFile(file);
    setFileContent(content);
    setShowPreview(true);
  };

  const handleBackToUpload = () => {
    setShowPreview(false);
    setUploadedFile(null);
    setFileContent("");
  };

  const handlePreviewSuccess = (newTranslationId: string) => {
    setTranslationId(newTranslationId);
  };
  return (
    <BaseModal
      open={true}
      onOpenChange={(open) => !open && onClose()}
      title={t("translation.createTranslation")}
      variant="fixed"
      size="lg"
    >
      <div className="space-y-8">
        {!showPreview ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <UploadMethodTabs
                activeMethod={uploadMethod}
                onMethodChange={setUploadMethod}
                availableMethods={["empty", "file", "openpecha"]}
              >
                {uploadMethod !== "openpecha" && (
                  <div className="mb-6">
                    <SelectLanguage
                      selectedLanguage={language}
                      setSelectedLanguage={setLanguage}
                    />
                  </div>
                )}
                
                <TabContentWrapper value="empty">
                  <EmptyDocumentCreator
                    language={language}
                    rootId={rootId}
                    onSuccess={setTranslationId}
                    refetchTranslations={refetchTranslations}
                  />
                </TabContentWrapper>

                <TabContentWrapper value="file">
                  <TextUploader
                    isRoot={false}
                    isPublic={false}
                    selectedLanguage={language}
                    setRootId={setTranslationId}
                    rootId={rootId}
                    refetchTranslations={refetchTranslations}
                    previewMode={true}
                    onFileLoaded={handleFileLoaded}
                    disable={!language || language === ""}
                  />
                </TabContentWrapper>

                <TabContentWrapper value="openpecha" >
                  <OpenPechaTranslationLoader 
                    rootId={rootId} 
                    onSuccess={setTranslationId} 
                    refetchTranslations={refetchTranslations} 
                  />
                </TabContentWrapper>
              </UploadMethodTabs>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-lg font-medium text-gray-900">Translation Preview</h3>
              <p className="text-sm text-gray-600 mt-1">Review your uploaded content before creating the translation</p>
            </div>
            <TextPreview
              file={uploadedFile!}
              fileContent={fileContent}
              language={language}
              rootId={rootId}
              onCancel={handleBackToUpload}
              onSuccess={handlePreviewSuccess}
              refetchTranslations={refetchTranslations}
            />
          </div>
        )}
      </div>
    </BaseModal>
  );
};

const EmptyDocumentCreator = ({
  language,
  rootId,
  onSuccess,
  refetchTranslations,
}: {
  language: string;
  rootId: string;
  onSuccess: (id: string) => void;
  refetchTranslations: () => Promise<QueryObserverResult<unknown, Error>>;
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>("");

  const createEmptyTranslationMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      const timestamp = Date.now();
      const identifier = `empty-translation-${language}-${timestamp}`;

      console.log("Creating empty translation with:", {
        name: `Empty Translation - ${language}`,
        identifier,
        isRoot: "false",
        language,
        rootId,
      });

      formData.append("name", `Empty Translation - ${language}`);
      formData.append("identifier", identifier);
      formData.append("isRoot", "false");
      formData.append("isPublic", "false");
      formData.append("language", language);
      formData.append("rootId", rootId);
      // Don't append any file for empty document

      return createDocument(formData);
    },
    onSuccess: (response) => {
      console.log("Empty translation created successfully:", response);
      setIsCreating(false);
      onSuccess(response.id);
      refetchTranslations?.();
    },
    onError: (error) => {
      console.error("Error creating empty translation:", error);
      setError(error.message || "Failed to create empty translation");
      setIsCreating(false);
    },
  });

  const handleCreateEmptyDocument = () => {
    if (!language) {
      setError("Please select a language first");
      return;
    }
    setError("");
    setIsCreating(true);
    createEmptyTranslationMutation.mutate();
  };

  const isDisabled = !language || isCreating;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2 text-red-700">
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
          <span className="text-xl">📄</span>
        </div>
        <h3 className="text-base font-medium text-gray-900 mb-2">
          Create Empty Translation
        </h3>
        <p className="text-gray-500 text-sm max-w-sm mb-6">
          Start with a blank document and add your translation content manually.
        </p>

        <Button
          onClick={handleCreateEmptyDocument}
          disabled={isDisabled}
          className="px-6 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-gray-300 disabled:text-gray-500 text-white transition-all duration-200 font-medium"
        >
          {isCreating ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating...
            </div>
          ) : (
            "Create Empty Document"
          )}
        </Button>
        
        {!language && (
          <p className="text-xs text-amber-600 mt-2">
            Select a language above to continue
          </p>
        )}
      </div>
    </div>
  );
};

export default CreateTranslationModal;
