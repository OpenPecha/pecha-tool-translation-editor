import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createDocument } from "@/api/document";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SelectLanguage from "../DocumentCreateModal/SelectLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TextUploader from "../DocumentCreateModal/TextUploader";
import SelectPechas, { PechaType } from "../DocumentCreateModal/SelectPechas";
import MetaDataInput from "../DocumentCreateModal/MetaDataInput";

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
  const [uploadMethod, setUploadMethod] = useState<"file" | "openpecha">(
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
              onValueChange={(v) => setUploadMethod(v as "file" | "openpecha")}
            >
              <TabsList className="w-full">
                <TabsTrigger value="file" className="cursor-pointer">
                  File
                </TabsTrigger>
                <TabsTrigger value="openpecha" className="cursor-pointer">
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
                />
              </TabsContent>

              <TabsContent value="openpecha" className="pt-2">
                <SelectPechas
                  selectedRootPecha={selectedRootPecha}
                  setSelectedRootPecha={setSelectedRootPecha}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateTranslationModal;
