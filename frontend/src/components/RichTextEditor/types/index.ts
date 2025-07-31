export interface AnnotationRange {
  // Core position fields (used by frontend)
  from: number;
  to: number;
  type: "bold" | "italic" | "underline" | string;

  // Database fields (optional - only when loaded from database)
  id?: string;
  content?: Record<string, unknown>;
  createdAt?: string;
}

export interface CurrentDocType {
  id: string;
  content?: string; // Plain text content (may be encoded with annotation markers)
  translations?: Array<{ id: string; language: string; name: string }>;
  annotations?: Array<{
    from: number;
    to: number;
    type: string;
    // Optional database fields (may not be present in converted format from backend)
    id?: string;
    content?: Record<string, unknown>;
    createdAt?: string;
  }>;
}

export interface RichTextCodeMirrorEditorProps {
  documentId: string | undefined;
  isEditable: boolean;
  currentDoc: CurrentDocType;
}

export interface FormatType {
  BOLD: "bold";
  ITALIC: "italic";
  UNDERLINE: "underline";
  H1: "h1";
  H2: "h2";
  H3: "h3";
}

export const FORMAT_TYPES: FormatType = {
  BOLD: "bold",
  ITALIC: "italic",
  UNDERLINE: "underline",
  H1: "h1",
  H2: "h2",
  H3: "h3",
} as const;
