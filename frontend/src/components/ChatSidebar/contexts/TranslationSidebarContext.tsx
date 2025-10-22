import type React from "react";
import { createContext, useContext } from "react";
import { useTranslationSidebarOperations } from "../../TranslationSidebar/hooks/useTranslationSidebarOperations";

type TranslationSidebarContextType = ReturnType<
  typeof useTranslationSidebarOperations
> | null;

const TranslationSidebarContext =
  createContext<TranslationSidebarContextType>(null);

export const TranslationSidebarProvider = ({
  documentId,
  children,
}: {
  documentId: string;
  children: React.ReactNode;
}) => {
  const operations = useTranslationSidebarOperations({ documentId });
  return (
    <TranslationSidebarContext.Provider value={operations}>
      {children}
    </TranslationSidebarContext.Provider>
  );
};

export const useTranslationSidebar = () => {
  const context = useContext(TranslationSidebarContext);
  if (!context) {
    throw new Error(
      "useTranslationSidebar must be used within a TranslationSidebarProvider"
    );
  }
  return context;
};
