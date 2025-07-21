import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, QueryObserverResult } from "@tanstack/react-query";
import { generateTranslation } from "@/api/document";
import SelectLanguage from "../Dashboard/DocumentCreateModal/SelectLanguage";
import TextUploader from "../Dashboard/DocumentCreateModal/TextUploader";
import { useParams } from "react-router-dom";
import SegmentationOptions from "./SegmentationOptions";
import { models, token_limit } from "@/config";
import { useTranslate } from "@tolgee/react";
import {
  BaseModal,
  UploadMethodTabs,
  TabContentWrapper,
  ErrorDisplay,
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
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>("file");
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
                  availableMethods={["file", "ai", "openpecha"]}
                >
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

                  <TabContentWrapper value="ai">
                    <AITranslation
                      language={language}
                      onClose={onClose}
                      refetchTranslations={refetchTranslations}
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
                        Please use file upload or AI generation for now.
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

const AITranslation = ({
  language,
  onClose,
  refetchTranslations,
}: {
  language: string;
  onClose: () => void;
  refetchTranslations: () => Promise<QueryObserverResult<unknown, Error>>;
}) => {
  const { id } = useParams();
  const [selectedCredential, setSelectedCredential] = useState<string>(
    models.default
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [segmentationMethod, setSegmentationMethod] = useState<
    "newline" | "botok"
  >("newline");

  const generateTranslationMutation = useMutation({
    mutationFn: generateTranslation,
    onSuccess: () => {
      setIsGenerating(false);
      refetchTranslations();
      onClose();
    },
    onError: (error) => {
      console.error("Error generating translation:", error);
      setError(error.message);
      setIsGenerating(false);
    },
  });

  const handleSendAItranslation = () => {
    setError(""); // Clear any previous errors
    setIsGenerating(true);

    generateTranslationMutation.mutate({
      rootId: id!,
      language,
      model: selectedCredential,
      use_segmentation: segmentationMethod,
    });
  };

  return (
    <div className="space-y-6">
      <ErrorDisplay error={error} />

      {/* Provider and model selection */}
      <div className="space-y-3">
        <Label
          htmlFor="credential-select"
          className="text-sm font-medium text-gray-700"
        >
          Select API Credential
        </Label>
        <Select
          value={selectedCredential}
          onValueChange={setSelectedCredential}
        >
          <SelectTrigger
            id="credential-select"
            className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          >
            <SelectValue placeholder="Select API credential" />
          </SelectTrigger>
          <SelectContent className="z-[10000]">
            {models.options.map((model) => (
              <SelectItem
                key={model.name}
                value={model.value}
                disabled={model.disabled}
              >
                <div className="flex items-center">
                  {model.name}
                  {model.disabled && (
                    <span className="ml-2 text-xs text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          {token_limit} tokens are allowed. Contact us for more tokens.
        </p>
      </div>

      {/* Segmentation options */}
      <SegmentationOptions
        selectedMethod={segmentationMethod}
        onMethodChange={setSegmentationMethod}
      />

      {/* Generate button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSendAItranslation}
          disabled={isGenerating || !selectedCredential}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          {isGenerating ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </div>
          ) : (
            "Generate Translation"
          )}
        </Button>
      </div>
    </div>
  );
};

export default CreateTranslationModal;
