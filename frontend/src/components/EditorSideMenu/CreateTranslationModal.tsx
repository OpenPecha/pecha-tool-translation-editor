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
  FormSection,
  type UploadMethod,
} from "@/components/shared/modals";

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
  const [language, setLanguage] = useState("");
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
      <div className="space-y-6">
        {!showPreview ? (
          <>
            <FormSection
              title="Language Selection"
              description="Choose the target language for your translation"
            >
              <SelectLanguage
                selectedLanguage={language}
                setSelectedLanguage={setLanguage}
              />
            </FormSection>

            {language && (
              <FormSection
                title="Upload Method"
                description="Choose how you want to create your translation"
              >
                <UploadMethodTabs
                  activeMethod={uploadMethod}
                  onMethodChange={setUploadMethod}
                  availableMethods={["empty", "file", "openpecha"]}
                >
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
                    />
                  </TabContentWrapper>

                  <TabContentWrapper value="openpecha">
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl">🚧</span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Coming Soon
                      </h3>
                      <p className="text-gray-600 max-w-sm">
                        OpenPecha integration is currently in development.
                        Please use empty document or file upload for now.
                      </p>
                    </div>
                  </TabContentWrapper>
                </UploadMethodTabs>
              </FormSection>
            )}
          </>
        ) : (
          <FormSection
            title="Translation Preview"
            description="Review your uploaded content before creating the translation"
          >
            <TextPreview
              file={uploadedFile!}
              fileContent={fileContent}
              language={language}
              rootId={rootId}
              onCancel={handleBackToUpload}
              onSuccess={handlePreviewSuccess}
              refetchTranslations={refetchTranslations}
            />
          </FormSection>
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
    setError("");
    setIsCreating(true);
    createEmptyTranslationMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <span className="text-sm">⚠️ {error}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">📄</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Create Empty Translation
        </h3>
        <p className="text-gray-600 max-w-sm mb-6">
          Start with a blank document and add your translation content manually.
        </p>

        <Button
          onClick={handleCreateEmptyDocument}
          disabled={isCreating}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white transition-colors"
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
      </div>
    </div>
  );
};

export default CreateTranslationModal;
