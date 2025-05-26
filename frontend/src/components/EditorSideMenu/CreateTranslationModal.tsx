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
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { generateTranslation } from "@/api/document";
import { Switch } from "@/components/ui/switch";

import SelectLanguage from "../DocumentCreateModal/SelectLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TextUploader from "../DocumentCreateModal/TextUploader";
import SelectPechas, { PechaType } from "../DocumentCreateModal/SelectPechas";
import { useParams } from "react-router-dom";

interface CreateTranslationModalProps {
  rootId: string;
  onClose: () => void;
}

const CreateTranslationModal: React.FC<CreateTranslationModalProps> = ({
  rootId,
  onClose,
}) => {
  const [language, setLanguage] = useState("");
  const [uploadMethod, setUploadMethod] = useState<"file" | "openpecha" | "ai">(
    "file"
  );
  const [selectedRootPecha, setSelectedRootPecha] = useState<PechaType | null>(
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
                <TabsTrigger
                  value="openpecha"
                  className={selectedTabClass("openpecha")}
                >
                  OpenPecha
                </TabsTrigger>
                <TabsTrigger value="ai" className={selectedTabClass("ai")}>
                  AI Generate
                </TabsTrigger>
              </TabsList>
              <TabsContent value="file" className="pt-2">
                <TextUploader
                  isRoot={false}
                  isPublic={false}
                  selectedLanguage={language}
                  setRootId={setTranslationId}
                  rootId={rootId}
                />
              </TabsContent>

              <TabsContent value="openpecha" className="pt-2">
                <SelectPechas
                  selectedRootPecha={selectedRootPecha}
                  setSelectedRootPecha={setSelectedRootPecha}
                />
              </TabsContent>

              <TabsContent value="ai" className="pt-2">
                <AITranslation language={language} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

const AITranslation = ({ language }: { language: string }) => {
  // AI generation related states
  const { id } = useParams();
  const [selectedCredential, setSelectedCredential] = useState<string>(
    "claude-3-haiku-20240307"
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [useSegmentation, setUseSegmentation] = useState<boolean>(true);

  // Get the query client for invalidating queries
  const queryClient = useQueryClient();

  // Fetch API credentials from the settings
  // const {
  //   data: apiCredentials,
  //   isLoading,
  //   error,
  // } = useQuery({
  //   queryKey: ["api-credentials"],
  //   queryFn: fetchApiCredentials,
  // });

  // Use React Query mutation for generating translations
  const generateTranslationMutation = useMutation({
    mutationFn: generateTranslation,
    onSuccess: (data) => {
      console.log("Translation generation started:", data);
      // Refresh the document list to show the new translation with progress bar
      queryClient.invalidateQueries({ queryKey: [`document-${id}`] });
      setIsGenerating(false);
    },
    onError: (error) => {
      console.error("Error generating translation:", error);
      alert(
        `Error: ${
          error instanceof Error
            ? error.message
            : "Failed to generate translation"
        }`
      );
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
      use_segmentation: useSegmentation,
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
            <SelectItem
              key={"claude-3-haiku-20240307"}
              value={"claude-3-haiku-20240307"}
            >
              claude-3-haiku-20240307
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Segmentation toggle */}

      <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg border border-gray-200/50">
        <div className="space-y-1">
          <Label
            htmlFor="segmentation"
            className="text-sm font-medium text-gray-900"
          >
            Use segmentation for translation
          </Label>
          <p className="text-xs text-gray-500">
            (Improves translation quality for structured text)
          </p>
        </div>
        <Switch
          id="segmentation"
          checked={useSegmentation}
          onCheckedChange={setUseSegmentation}
        />
      </div>

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
