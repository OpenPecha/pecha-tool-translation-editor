import React, { useEffect, useState } from "react";
import { X, Eye, EyeOff, AlertCircle } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import { fetchApiCredentials, ApiCredential } from "@/api/apiCredentials";

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
  const [selectedCredential, setSelectedCredential] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const { getQuill } = useEditor();
  const quill = getQuill(id!);
  const content = quill?.getText();

  // Fetch API credentials from the settings
  const { data: apiCredentials, isLoading, error } = useQuery({
    queryKey: ["api-credentials"],
    queryFn: fetchApiCredentials,
  });

  // Group credentials by provider
  const credentialsByProvider = React.useMemo(() => {
    if (!apiCredentials) return {};
    return apiCredentials.reduce((acc: Record<string, ApiCredential[]>, credential) => {
      if (!acc[credential.provider]) {
        acc[credential.provider] = [];
      }
      acc[credential.provider].push(credential);
      return acc;
    }, {});
  }, [apiCredentials]);

  // Get the current selected credential
  const currentCredential = React.useMemo(() => {
    if (!selectedCredential || !apiCredentials) return null;
    return apiCredentials.find(cred => cred.id === selectedCredential) || null;
  }, [selectedCredential, apiCredentials]);

  // Handle the translation generation
  const handleSendAItranslation = () => {
    if (!currentCredential) {
      alert("Please select an API credential");
      return;
    }
    
    if (!content) {
      alert("No text to translate. Please make sure the document has content.");
      return;
    }
    
    // Get the first line of text
    const firstLine = content.split('\n')[0].trim();
    
    if (!firstLine) {
      alert("No text to translate. The document appears to be empty.");
      return;
    }
    
    console.log("Generating translation with:", {
      provider: currentCredential.provider,
      model: currentCredential.provider.toLowerCase().includes("openai") ? "gpt-3.5-turbo" : "claude-2",
      text: firstLine
    });
    
    setIsGenerating(true);
    
    // Simulate translation process (replace with actual API call)
    setTimeout(() => {
      setIsGenerating(false);
      alert(`Translation generated successfully: "${firstLine} (translated to English)"`); 
    }, 2000);
  };

  if (isLoading) {
    return <div>Loading API credentials...</div>;
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <div className="flex items-center">
          <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
          <p className="text-sm text-red-700">
            Error loading API credentials. Please check your connection and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* No credentials warning */}
      {(!apiCredentials || apiCredentials.length === 0) && (
        <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
            <p className="text-sm text-yellow-700">
              No API credentials found. Please add credentials in Settings &gt; API Keys.
            </p>
          </div>
        </div>
      )}

      {/* Provider and model selection */}
      <div>
        <Label htmlFor="credential-select">Select API Credential</Label>
        <Select 
          value={selectedCredential} 
          onValueChange={setSelectedCredential}
          disabled={!apiCredentials || apiCredentials.length === 0}
        >
          <SelectTrigger id="credential-select">
            <SelectValue placeholder="Select API credential" />
          </SelectTrigger>
          <SelectContent className="z-[10000]">
            {Object.entries(credentialsByProvider).map(([provider, credentials]) => (
              <React.Fragment key={provider}>
                <div className="px-2 py-1.5 text-sm font-semibold">{provider}</div>
                {credentials.map((credential) => (
                  <SelectItem key={credential.id} value={credential.id}>
                    {credential.provider} - {credential.id.substring(0, 8)}
                  </SelectItem>
                ))}
              </React.Fragment>
            ))}
          </SelectContent>
        </Select>
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
