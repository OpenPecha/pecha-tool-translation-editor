import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { createDocument } from "@/api/document";
import { ModalFooter, ErrorDisplay } from "@/components/shared/modals";
import { useTranslate } from "@tolgee/react";

interface TextPreviewProps {
  file: File;
  fileContent: string;
  language: string;
  rootId: string;
  onCancel: () => void;
  onSuccess: (translationId: string) => void;
  refetchTranslations?: () => Promise<unknown>;
}

export function TextPreview({
  file,
  fileContent,
  language,
  rootId,
  onCancel,
  onSuccess,
  refetchTranslations,
}: TextPreviewProps) {
  const [error, setError] = useState("");
  const { t } = useTranslate();

  const createTranslationMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      const uniqueIdentifier = `${fileNameWithoutExt}-${Date.now()}`;

      formData.append("name", fileNameWithoutExt);
      formData.append("identifier", uniqueIdentifier);
      formData.append("isRoot", "false");
      formData.append("isPublic", "false");
      formData.append("language", language);
      formData.append("file", file);
      formData.append("rootId", rootId);

      const response = await createDocument(formData);
      return response;
    },
    onSuccess: (response) => {
      if (refetchTranslations) {
        refetchTranslations();
      }
      onSuccess(response.id);
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to create translation");
    },
  });

  const handleConfirm = () => {
    if (!fileContent.trim()) {
      setError("File content is empty");
      return;
    }

    if (!language) {
      setError("Language is required");
      return;
    }

    setError(""); // Clear any previous errors
    createTranslationMutation.mutate();
  };


  return (
    <div className="space-y-6">
      <ErrorDisplay error={error} />

      {/* Content Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Content Preview</h3>
          {fileContent.trim() && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Content loaded</span>
            </div>
          )}
        </div>

        <Textarea
          value={fileContent}
          rows={12}
          readOnly
          className="font-monlam resize-none border-gray-300 bg-gray-50 text-sm leading-relaxed"
          placeholder="File content will appear here..."
        />

        {!fileContent.trim() && (
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>No content found in the file</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <ModalFooter
        onCancel={onCancel}
        onConfirm={handleConfirm}
        confirmDisabled={!fileContent.trim() || !language}
        confirmLoading={createTranslationMutation.isPending}
        confirmText={t("translation.createTranslation")}
        cancelText="Back to Upload"
      />
    </div>
  );
}
