import { useState, useEffect } from 'react';
import { TargetLanguage, TextType, ModelName } from '@/api/translate';

// Export types for use in other components
export type { TargetLanguage, TextType, ModelName };

export interface TranslationConfig {
  targetLanguage: TargetLanguage;
  textType: TextType;
  modelName: ModelName;
  batchSize: number;
  userRules: string;
  extractGlossary: boolean;
}

interface TranslationUIState {
  isSidebarCollapsed: boolean;
}

const STORAGE_KEYS = {
  CONFIG: 'pecha-translation-config',
  UI_STATE: 'pecha-translation-ui-state'
} as const;

const DEFAULT_CONFIG: TranslationConfig = {
  targetLanguage: "english",
  textType: "commentary",
  modelName: "claude-3-5-sonnet-20241022",
  batchSize: 2,
  userRules: "do translation normally",
  extractGlossary: false,
};

const DEFAULT_UI_STATE: TranslationUIState = {
  isSidebarCollapsed: false,
};

/**
 * Custom hook for managing translation settings with localStorage persistence
 */
export function useTranslationSettings() {
  // Load initial config from localStorage or use defaults
  const getInitialConfig = (): TranslationConfig => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (stored) {
        const parsed = JSON.parse(stored) as TranslationConfig;
        // Validate that all required properties exist
        return {
          ...DEFAULT_CONFIG,
          ...parsed
        };
      }
    } catch (error) {
      console.warn('Failed to load translation config from localStorage:', error);
    }
    return DEFAULT_CONFIG;
  };

  // Load initial UI state from localStorage or use defaults
  const getInitialUIState = (): TranslationUIState => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.UI_STATE);
      if (stored) {
        const parsed = JSON.parse(stored) as TranslationUIState;
        return {
          ...DEFAULT_UI_STATE,
          ...parsed
        };
      }
    } catch (error) {
      console.warn('Failed to load translation UI state from localStorage:', error);
    }
    return DEFAULT_UI_STATE;
  };

  const [config, setConfigState] = useState<TranslationConfig>(() => getInitialConfig());
  const [uiState, setUIStateState] = useState<TranslationUIState>(() => getInitialUIState());

  // Save config to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save translation config to localStorage:', error);
    }
  }, [config]);

  // Save UI state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.UI_STATE, JSON.stringify(uiState));
    } catch (error) {
      console.error('Failed to save translation UI state to localStorage:', error);
    }
  }, [uiState]);

  // Update specific config property
  const updateConfig = <K extends keyof TranslationConfig>(
    key: K,
    value: TranslationConfig[K]
  ) => {
    setConfigState(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Update UI state property
  const updateUIState = <K extends keyof TranslationUIState>(
    key: K,
    value: TranslationUIState[K]
  ) => {
    setUIStateState(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Reset config to defaults
  const resetConfig = () => {
    setConfigState(DEFAULT_CONFIG);
  };

  // Reset UI state to defaults
  const resetUIState = () => {
    setUIStateState(DEFAULT_UI_STATE);
  };

  // Clear all stored settings
  const clearStoredSettings = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.CONFIG);
      localStorage.removeItem(STORAGE_KEYS.UI_STATE);
      setConfigState(DEFAULT_CONFIG);
      setUIStateState(DEFAULT_UI_STATE);
    } catch (error) {
      console.error('Failed to clear stored settings:', error);
    }
  };

  return {
    // Config state and updaters
    config,
    updateConfig,
    resetConfig,
    
    // UI state and updaters
    uiState,
    updateUIState,
    resetUIState,
    
    // Utility functions
    clearStoredSettings,
    
    // Convenience accessors for common UI state
    isSidebarCollapsed: uiState.isSidebarCollapsed,
    setIsSidebarCollapsed: (collapsed: boolean) => updateUIState('isSidebarCollapsed', collapsed),
    
    // Debug function for development
    debugSettings: () => {
      console.log('Current Translation Settings:', {
        config,
        uiState,
        storedConfig: localStorage.getItem(STORAGE_KEYS.CONFIG),
        storedUIState: localStorage.getItem(STORAGE_KEYS.UI_STATE)
      });
    },
  };
}
