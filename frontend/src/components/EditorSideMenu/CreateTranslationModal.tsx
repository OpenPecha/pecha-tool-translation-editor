import React, { useEffect, useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import SelectLanguage from "../DocumentCreateModal/SelectLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TextUploader from "../DocumentCreateModal/TextUploader";
import SelectPechas, { PechaType } from "../DocumentCreateModal/SelectPechas";
import { useParams } from "react-router-dom";
import { useEditor } from "@/contexts/EditorContext";

interface CreateTranslationModalProps {
  rootId: string;
  rootName: string;
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
  }, [translationId]);
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
                <TabsTrigger value="file" className="cursor-pointer">
                  File
                </TabsTrigger>
                <TabsTrigger value="openpecha" className="cursor-pointer">
                  OpenPecha
                </TabsTrigger>
                <TabsTrigger value="ai" className="cursor-pointer">
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
                <AITranslation />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

const AITranslation = () => {
  // AI generation related states
  const { id } = useParams();
  const [aiModel, setAiModel] = useState<string>("claude");
  const [aiApiKey, setAiApiKey] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const { getQuill } = useEditor();
  const quill = getQuill(id!);
  const content = quill?.getText();
  const handleSendAItranslation = () => {
    console.log(aiModel, aiApiKey, content);
  };
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="ai-model">Select AI Model</Label>
        <Select value={aiModel} onValueChange={setAiModel}>
          <SelectTrigger id="ai-model">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent className="z-[10000]">
            <SelectItem value="claude">Claude</SelectItem>
            {/* <SelectItem value="gpt-4">GPT-4</SelectItem> */}
            {/* <SelectItem value="gemini">Gemini</SelectItem> */}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="api-key">API Key</Label>
        <div className="relative">
          <Input
            id="api-key"
            type={showApiKey ? "text" : "password"}
            value={aiApiKey}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setAiApiKey(e.target.value)
            }
            placeholder="Enter your API key"
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowApiKey(!showApiKey)}
            tabIndex={-1}
          >
            {showApiKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span className="sr-only">
              {showApiKey ? "Hide" : "Show"} API key
            </span>
          </Button>
        </div>
      </div>
      <Button
        className="float-right"
        disabled={!aiApiKey || isGenerating}
        onClick={handleSendAItranslation}
      >
        {isGenerating ? "Generating..." : "Generate Translation"}
      </Button>
    </div>
  );
};

export default CreateTranslationModal;
