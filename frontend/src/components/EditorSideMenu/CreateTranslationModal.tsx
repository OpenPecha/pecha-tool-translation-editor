import React, { useState } from "react";
import { X } from "lucide-react";
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
import { createDocument } from "@/api/document";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SelectLanguage from "../DocumentCreateModal/SelectLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TextUploader from "../DocumentCreateModal/TextUploader";
import SelectPechas, { PechaType } from "../DocumentCreateModal/SelectPechas";

interface CreateTranslationModalProps {
  rootDocId: string;
  rootIdentifier: string;
  onClose: () => void;
  onSuccess: (translationId: string) => void;
}

const CreateTranslationModal: React.FC<CreateTranslationModalProps> = ({
  rootDocId,
  rootIdentifier,
  onClose,
  onSuccess,
}) => {
  const [identifier, setIdentifier] = useState(`${rootIdentifier}-translation`);
  const [language, setLanguage] = useState("");
  const [error, setError] = useState("");
  const [uploadMethod, setUploadMethod] = useState<"file" | "openpecha">("file");
  const [selectedRootPecha, setSelectedRootPecha] = useState<PechaType | null>(null);
  const [translationId, setTranslationId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createTranslationMutation = useMutation({
    mutationFn: async () => {
      if (!identifier.trim()) {
        throw new Error("Identifier is required");
      }
      if (!language) {
        throw new Error("Language is required");
      }

      // If we already have a translation ID from file upload, use that
      if (translationId) {
        return { id: translationId };
      }

      const formData = new FormData();
      formData.append("identifier", identifier);
      formData.append("isRoot", "false");
      formData.append("rootId", rootDocId);
      formData.append("language", language);
      
      // If using OpenPecha and a pecha is selected
      if (uploadMethod === "openpecha" && selectedRootPecha) {
        formData.append("openpechaId", selectedRootPecha.id);
      }

      return createDocument(formData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["document", rootDocId] });
      onSuccess(data.id);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validation for OpenPecha method
    if (uploadMethod === "openpecha" && !selectedRootPecha) {
      setError("Please select an OpenPecha document");
      return;
    }
    
    // For file upload method, we should already have a translation ID
    // If not, show an error
    if (uploadMethod === "file" && !translationId) {
      setError("Please upload a translation file");
      return;
    }
    
    createTranslationMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create Translation</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Identifier</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter document identifier"
                required
              />
              <p className="text-xs text-gray-500">
                This will be used to identify the translation
              </p>
            </div>

            <SelectLanguage
              selectedLanguage={language}
              setSelectedLanguage={setLanguage}
            />
            
            <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as "file" | "openpecha")}>
              <TabsList className="w-full">
                <TabsTrigger value="file" className="cursor-pointer">
                  Upload File
                </TabsTrigger>
                <TabsTrigger value="openpecha" className="cursor-pointer">
                  OpenPecha URL
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="file" className="pt-2">
                {!translationId && (
                  <TextUploader
                    isRoot={false}
                    isPublic={false}
                    selectedLanguage={language}
                    setRootId={setTranslationId}
                  />
                )}
                {translationId && (
                  <div className="text-sm text-green-600 py-2">
                    ✓ Translation file uploaded successfully
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="openpecha" className="pt-2">
                <SelectPechas
                  selectedRootPecha={selectedRootPecha}
                  setSelectedRootPecha={setSelectedRootPecha}
                />
              </TabsContent>
            </Tabs>

            {error && (
              <div className="bg-red-50 text-red-600 p-2 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="pt-4 flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={createTranslationMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTranslationMutation.isPending}
              >
                {createTranslationMutation.isPending
                  ? "Creating..."
                  : "Create Translation"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTranslationModal;
