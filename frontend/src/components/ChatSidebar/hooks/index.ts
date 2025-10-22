// Export all hooks for easy importing
export { useTranslationOperations } from "./useTranslationOperations";
export { useTranslationResults } from "./useTranslationResults";
export { useTextSelection } from "./useTextSelection";
export { useCopyOperations } from "./useCopyOperations";
export { useGlossaryOperations } from "./useGlossaryOperations";
export { useStandardizationOperations } from "./useStandardizationOperations";

// Export types for external use
export type {
  TranslationConfig,
  TranslationResult,
} from "./useTranslationOperations";
export type { GlossaryTerm, GlossaryEvent } from "./useGlossaryOperations";
