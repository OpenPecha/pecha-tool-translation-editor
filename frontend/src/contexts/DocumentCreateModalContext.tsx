import React, { createContext, useContext } from "react";
import {
  useDocumentCreateModal
} from "@/hooks/useDocumentCreateModal";

type DocumentCreateModalContextType = ReturnType<typeof useDocumentCreateModal> | null;

const DocumentCreateModalContext = createContext<DocumentCreateModalContextType>(
  null
);

export function DocumentCreateModalProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const value = useDocumentCreateModal();
  return (
    <DocumentCreateModalContext.Provider value={value}>
      {children}
    </DocumentCreateModalContext.Provider>
  );
}

export function useDocumentCreateModalContext() {
  const context = useContext(DocumentCreateModalContext);
  if (!context) {
    throw new Error(
      "useDocumentCreateModalContext must be used within a DocumentCreateModalProvider"
    );
  }
  return context;
}
