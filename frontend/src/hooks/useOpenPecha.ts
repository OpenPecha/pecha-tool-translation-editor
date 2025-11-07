import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAnnotations } from "@/api/openpecha";
import {
  useFetchInstances,
  useFetchTextContent,
  useFetchTexts,
} from "@/api/queries/openpecha_api";

// Types for OpenPecha data structures
interface OpenPechaText {
  type: any;
  id: string;
  title:
    | string
    | { bo?: string; en?: string; [key: string]: string | undefined };
  alt_title?: string[];
  language: string;
}

interface OpenPechaInstance {
  id: string;
  incipit_title: {
    bo?: string;
    en?: string;
    [key: string]: string | undefined;
  };
  annotation: { [key: string]: any };
  type: string;
}

interface AnnotationContentType {
  id: string;
  span: {
    start: number;
    end: number;
  };
}

export function useOpenPecha() {
  // State management
  const [selectedTextId, setSelectedTextId] = useState("");
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState("");
  const [processedText, setProcessedText] = useState("");

  // Utility function to extract title from title object or string
  const extractTitle = (
    title:
      | string
      | { bo?: string; en?: string; [key: string]: string | undefined }
      | undefined,
    fallback: string = ""
  ): string => {
    if (typeof title === "string") return title;
    if (!title) return fallback;
    return title.bo ?? title.en ?? title[Object.keys(title)[0]] ?? fallback;
  };

  // API queries
  const {
    data: texts = [],
    isLoading: textsLoading,
    error: textsError,
  } = useFetchTexts();

  const {
    data: instances = [],
    isLoading: instancesLoading,
    error: instancesError,
  } = useFetchInstances(selectedTextId);

  const {
    data: textContent,
    isLoading: textContentLoading,
    error: textContentError,
  } = useFetchTextContent(selectedInstanceId);

  const {
    data: annotations,
    isLoading: annotationsLoading,
    error: annotationsError,
  } = useQuery<AnnotationContentType>({
    queryKey: ["annotations", selectedAnnotationId],
    queryFn: () => fetchAnnotations(selectedAnnotationId),
    enabled: !!selectedAnnotationId,
    staleTime: 5 * 60 * 1000,
  });

  const applySegmentation = (text: string, segments: any): string[] => {
    if (typeof text !== "string" || !Array.isArray(segments)) {
      throw new Error(
        "Invalid arguments: expected text (string) and segments (array)."
      );
    }
    return segments.map(({ span }) => {
      const { start, end } = span;

      if (start < 0 || end > text.length || start >= end) {
        throw new Error(`Invalid span range: start=${start}, end=${end}`);
      }

      return text.slice(start, end);
    });
  };
  // reset data flow when text changes
  useEffect(() => {
    setSelectedInstanceId("");
    setProcessedText("");
  }, [selectedTextId]);

  useEffect(() => {
    if (textContent?.annotations?.length) {
      const segmentation = textContent.annotations.find(
        (anno: { [key: string]: any }) => anno.type === "segmentation"
      );
      if (segmentation) {
        setSelectedAnnotationId(segmentation.annotation_id);
      }
    } else {
      setSelectedAnnotationId("");
      setProcessedText("");
    }
  }, [textContent]);

  useEffect(() => {
    if (textContent && annotations) {
      // Note: You might need to adjust `annotations.annotation` based on the actual API response.
      // This assumes the API returns an object like { annotation: [...] }.
      const segments = Array.isArray(annotations)
        ? annotations
        : annotations.annotation;

      if (segments) {
        const segmentedText = applySegmentation(textContent.content, segments);
        setProcessedText(segmentedText.join("\n"));
      }
    }
  }, [textContent, annotations]);
  // Prepare dropdown options
  const textOptions = texts.map((text: OpenPechaText) => ({
    value: text.id,
    label: extractTitle(text.title, text.id),
    subtitle: text.type,
  }));

  const instanceOptions = instances.map((instance: OpenPechaInstance) => ({
    value: instance.id,
    label: instance.id,
    subtitle: instance.type,
  }));

  return {
    selectedTextId,
    setSelectedTextId,
    selectedInstanceId,
    setSelectedInstanceId,
    processedText,
    texts,
    textsLoading,
    textsError,
    instances,
    instancesLoading,
    instancesError,
    textContent,
    textContentLoading,
    textContentError,
    annotationsLoading,
    annotationsError,
    textOptions,
    instanceOptions,
    extractTitle,
  };
}
