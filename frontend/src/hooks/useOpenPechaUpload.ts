import { useState } from "react";
import { uploadTranslationToOpenpecha } from "@/api/openpecha";
import { useEditor } from "@/contexts/EditorContext";
import { calculateAnnotations } from "@/utils/calculateAnnotations";
import type { Document } from "./useCurrentDoc";

interface UseOpenPechaUploadProps {
  sourceDoc: Document | null;
  translationDoc: Document | null;
}
interface Metadata {
  docId?: string;
  instanceId?: string;
  textId?: string;
}
const isMetadataAvailable = (metadata: Metadata | undefined) => {
  return metadata?.instanceId && metadata?.textId && metadata?.docId;
}
export function useOpenPechaUpload({
  sourceDoc,
  translationDoc,
}: UseOpenPechaUploadProps) {
  const { getQuill } = useEditor();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const instance_id = sourceDoc?.metadata?.instanceId as string | undefined;
  const isUploadable =(() => {
    console.log("isUploadable sourceDoc?.metadata", sourceDoc?.metadata);
    console.log("isUploadable translationDoc?.metadata", translationDoc?.metadata);
    if (isMetadataAvailable(sourceDoc?.metadata) && !isMetadataAvailable(translationDoc?.metadata)) {
      return true;
    }
    return false;
  })();
  const onUpload = async () => {
    if (!sourceDoc || !translationDoc || !instance_id) {
      const missingDataError =
        "Missing required data: " +
        (!sourceDoc ? "source document, " : "") +
        (!translationDoc ? "translation document, " : "") +
        (!instance_id ? "instance ID" : "");
      setError(missingDataError);
      return false;
    }

    const sourceQuill = getQuill(sourceDoc.id);
    const translationQuill = getQuill(translationDoc.id);

    if (!sourceQuill || !translationQuill) {
      setError("Editors not ready or missing data.");
      return false;
    }

    setIsUploading(true);
    setError(null);

    try {
      const sourceContent = sourceQuill.getText();
      const sourceContentProcessed = sourceContent.replace(/\n+/g, "\n");
      const translationContentRaw = translationQuill.getText();
      const translationContentProcessed = translationContentRaw.replace(
        /\n+/g,
        "\n",
      );

      const { annotations: sourceAnnotations } = calculateAnnotations(
        sourceContentProcessed,
      );
      const {
        annotations: translationAnnotations,
        cleanedContent: translationCleanedContent,
      } = calculateAnnotations(translationContentProcessed);

      const target_annotation = sourceAnnotations.map((anno, index) => ({
        ...anno,
        index,
      }));
      const segmentation = translationAnnotations;
      const alignment_annotation = translationAnnotations.map(
        (anno, index) => ({
          ...anno,
          index,
          alignment_index: [index],
        }),
      );

      const payload = {
        language: translationDoc.language || "en",
        content: translationCleanedContent,
        title: translationDoc.name,
        segmentation,
        target_annotation,
        alignment_annotation,
      };

      await uploadTranslationToOpenpecha(instance_id, payload,translationDoc.id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    onUpload,
    isUploading,
    error,
    instance_id,
    isUploadable,
  };
}
