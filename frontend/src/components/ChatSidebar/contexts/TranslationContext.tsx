import type React from "react";
import { createContext, useContext } from "react";
import { useTranslationController } from "../hooks/useTranslationController";

type TranslationContextType = ReturnType<
  typeof useTranslationController
> | null;

const TranslationContext = createContext<TranslationContextType>(null);

export const TranslationProvider = ({
  documentId,
  children,
}: {
  documentId: string;
  children: React.ReactNode;
}) => {
  const operations = useTranslationController({ documentId });
  return (
    <TranslationContext.Provider value={operations}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
};
