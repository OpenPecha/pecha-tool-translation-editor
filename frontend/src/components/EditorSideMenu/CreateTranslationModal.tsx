import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TextUploader from "../Dashboard/DocumentCreateModal/TextUploader";
import SelectPechas, {
  PechaType,
} from "../Dashboard/DocumentCreateModal/SelectPechas";
import { useParams } from "react-router-dom";
import SegmentationOptions from "./SegmentationOptions";
import { models, token_limit } from "@/config";

interface CreateTranslationModalProps {
  rootId: string;
  onClose: () => void;
  refetchTranslations: () => Promise<QueryObserverResult<any, Error>>;
}

const CreateTranslationModal: React.FC<CreateTranslationModalProps> = ({
  rootId,
  onClose,
  refetchTranslations,
}) => {
  const [language, setLanguage] = useState("");
  const [uploadMethod, setUploadMethod] = useState<"file" | "openpecha" | "ai">(
    "file"
  );
  const [selectedRootPecha, setSelectedRootPecha] = useState<string | null>(
    null
  );
  const [translationId, setTranslationId] = useState<string | null>(null);

  useEffect(() => {
    if (translationId) {
      onClose();
    }
  }, [translationId, onClose]);
  const selectedTabClass = (tab: "file" | "openpecha" | "ai") =>
    uploadMethod === tab
      ? " cursor-pointer"
      : "cursor-pointer text-sm font-medium text-gray-700";
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create Translation</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          <SelectLanguage
            selectedLanguage={language}
            setSelectedLanguage={setLanguage}
          />

          {language && (
            <Tabs
              value={uploadMethod}
              onValueChange={(v) =>
                setUploadMethod(v as "file" | "openpecha" | "ai")
              }
            >
              <TabsList className="w-full">
                <TabsTrigger value="file" className={selectedTabClass("file")}>
                  File
                </TabsTrigger>
                <TabsTrigger value="ai" className={selectedTabClass("ai")}>
                  AI Generate
                </TabsTrigger>
                <TabsTrigger
                  value="openpecha"
                  disabled={true}
                  className={selectedTabClass("openpecha")}
                >
                  OpenPecha
                </TabsTrigger>
              </TabsList>
              <TabsContent value="file" className="pt-2">
                <TextUploader
                  isRoot={false}
                  isPublic={false}
                  selectedLanguage={language}
                  setRootId={setTranslationId}
                  rootId={rootId}
                  refetchTranslations={refetchTranslations}
                />
              </TabsContent>

              <TabsContent value="openpecha" className="pt-2">
                <SelectPechas
                  selectedPecha={selectedRootPecha}
                  setSelectedPecha={setSelectedRootPecha}
                />
              </TabsContent>

              <TabsContent value="ai" className="pt-2">
                <AITranslation
                  language={language}
                  onClose={onClose}
                  refetchTranslations={refetchTranslations}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

const AITranslation = ({
  language,
  onClose,
  refetchTranslations,
}: {
  language: string;
  onClose: () => void;
  refetchTranslations: () => Promise<QueryObserverResult<any, Error>>;
}) => {
  // AI generation related states
  const { id } = useParams();
  const [selectedCredential, setSelectedCredential] = useState<string>(
    models.default
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [segmentationMethod, setSegmentationMethod] = useState<
    "newline" | "botok"
  >("newline");
  const generateTranslationMutation = useMutation({
    mutationFn: generateTranslation,
    onSuccess: (data) => {
      // Refresh the document list to show the new translation with progress bar
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

  // Handle the translation generation
  const handleSendAItranslation = () => {
    setIsGenerating(true);

    // Call the mutation with the required parameters
    generateTranslationMutation.mutate({
      rootId: id!,
      language,
      model: selectedCredential,
      use_segmentation: segmentationMethod,
    });
  };

  return (
    <div className="space-y-4">
      {/* No credentials warning */}

      {/* Provider and model selection */}
      <div className="space-y-2  gap-2 w-full">
        <Label htmlFor="credential-select text-sm font-medium text-gray-700">
          Select API Credential
        </Label>
        <Select
          value={selectedCredential}
          onValueChange={setSelectedCredential}
        >
          <SelectTrigger id="credential-select" className="w-full">
            <SelectValue placeholder="Select API credential" />
          </SelectTrigger>
          <SelectContent className="z-[10000]">
            {models.options.map((model) => (
              <SelectItem key={model.name} value={model.value}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-500">
          {token_limit} tokens are allowed. Contact us for more tokens.
        </p>
      </div>
      {/* mention only 30000 tokens are allowed */}

      {/* Segmentation toggle */}
      <SegmentationOptions
        selectedMethod={segmentationMethod}
        onMethodChange={setSegmentationMethod}
      />

      {error && <p className="text-red-500">{error}</p>}
      {/* Generate button */}
      <Button
        className="float-right"
        disabled={isGenerating || !selectedCredential}
        onClick={handleSendAItranslation}
      >
        {isGenerating ? "Generating..." : "Generate Translation"}
      </Button>
    </div>
  );
};

export default CreateTranslationModal;
