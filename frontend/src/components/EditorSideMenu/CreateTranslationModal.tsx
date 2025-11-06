import React, { useState } from "react";
import { QueryObserverResult, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { createDocument, deleteDocument } from "@/api/document";
import SelectLanguage from "../Dashboard/DocumentCreateModal/SelectLanguage";
import TextUploader from "../Dashboard/DocumentCreateModal/TextUploader";
import { useTranslation } from "react-i18next";
import {
  BaseModal,
  UploadMethodTabs,
  TabContentWrapper,
  TextPreview,
  type UploadMethod,
} from "@/components/shared/modals";
import { OpenPechaTranslationLoader } from "@/components/OpenPecha/OpenPechaTranslationLoader";

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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [newDocumentId, setNewDocumentId] = useState<string | null>(null);
  const [isCreationComplete, setIsCreationComplete] = useState(false);
  const { t } = useTranslation();

  const resetModalState = () => {
    setLanguage("");
    setUploadMethod("empty");
    setUploadedFile(null);
    setFileContent("");
    setShowPreview(false);
    setNewDocumentId(null);
    setIsCreationComplete(false);
  };

  const closeAndCleanup = async () => {
    if (newDocumentId && !isCreationComplete) {
      try {
        await deleteDocument(newDocumentId);
      } catch (error) {
        console.error("Failed to delete document:", error);
      }
    }
    onClose();
    resetModalState();
  };

  const handleModalOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      return;
    }
    closeAndCleanup();
  };

  const handleFileLoaded = (file: File, content: string) => {
    setUploadedFile(file);
    setFileContent(content);
    setShowPreview(true);
  };

  const handleBackToUpload = async () => {
    if (newDocumentId) {
      try {
        await deleteDocument(newDocumentId);
      } catch (error) {
        console.error("Failed to delete document:", error);
      }
      setNewDocumentId(null);
    }
    setShowPreview(false);
    setUploadedFile(null);
    setFileContent("");
  };

  const handlePreviewSuccess = (_newTranslationId: string) => {
    setIsCreationComplete(true);
    refetchTranslations();
    onClose();
  };
  const availableMethods = [
    { type: "empty", label: t("common.emptyText"), isDisabled: false },
    { type: "file", label: t("common.file"), isDisabled: false },
    { type: "openpecha", label: t("common.openpecha"), isDisabled: false },
  ];
  const filtered_availableMethods = availableMethods
    .filter((d) => !d.isDisabled)
    .map((d) => d.type);
  return (
    <BaseModal
      open={true}
      onOpenChange={handleModalOpenChange}
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
                availableMethods={filtered_availableMethods as UploadMethod[]}
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
                    onSuccess={() => {
                      setIsCreationComplete(true);
                      onClose();
                    }}
                    refetchTranslations={refetchTranslations}
                  />
                </TabContentWrapper>

                <TabContentWrapper value="file">
                  <TextUploader
                    isRoot={false}
                    isPublic={false}
                    selectedLanguage={language}
                    rootId={rootId}
                    previewMode={true}
                    onFileLoaded={handleFileLoaded}
                    disable={!language || language === ""}
                    setNewDocumentId={setNewDocumentId}
                  />
                </TabContentWrapper>

                <TabContentWrapper value="openpecha">
                  <OpenPechaTranslationLoader
                    rootId={rootId}
                    onSuccess={() => {
                      setIsCreationComplete(true);
                      onClose();
                    }}
                    refetchTranslations={refetchTranslations}
                  />
                </TabContentWrapper>
              </UploadMethodTabs>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-lg font-medium">
                {t("translation.translationPreview")}
              </h3>
              <p className="text-sm mt-1">
                {t("translation.reviewYourTranslation")}
              </p>
            </div>
            <TextPreview
              file={uploadedFile!}
              fileContent={fileContent}
              language={language}
              onCancel={handleBackToUpload}
              onSuccess={handlePreviewSuccess}
              translationId={newDocumentId!}
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
  const { t } = useTranslation();
  const createEmptyTranslationMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      const timestamp = Date.now();
      const identifier = `empty-translation-${language}-${timestamp}`;

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
        <div className="w-12 h-12 bg-neutral-50 dark:bg-neutral-700 rounded-lg flex items-center justify-center mb-4">
          <span className="text-xl">📄</span>
        </div>
        <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-300 mb-2">
          {t("translation.createEmptyTranslation")}
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-sm mb-6">
          {t("translation.startWithBlankDocument")}
        </p>

        <Button
          onClick={handleCreateEmptyDocument}
          disabled={isDisabled}
          className="px-6 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:bg-gray-300 disabled:text-neutral-500 text-white transition-all duration-200 font-medium"
        >
          {isCreating ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-neutral-300/30 border-t-neutral-300 rounded-full animate-spin" />
              {t("translation.creating")}
            </div>
          ) : (
            t("translation.createEmptyDocument")
          )}
        </Button>

        {!language && (
          <p className="text-xs text-neutral-600 mt-2">
            {t("translation.selectLanguageAboveToContinue")}
          </p>
        )}
      </div>
    </div>
  );
};

export default CreateTranslationModal;
