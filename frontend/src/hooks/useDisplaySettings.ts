import { useEffect } from "react";
import useLocalStorage from "./useLocalStorage";

export interface TypographySettings {
  fontFamily: "monlam" | "google-sans-regular" | "serif" | "monospace";
  fontSize: number; // in rem
  lineHeight: number;
}

export interface DisplaySettings {
  // Line Numbers
  showLineNumbers: boolean;
  
  // Background & Colors
  editorBackgroundColor: string;
  selectionHighlightColor: string;
  
  // Typography Settings - Separate for Root and Translation Editors
  rootEditorTypography: TypographySettings;
  translationEditorTypography: TypographySettings;
  
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  showLineNumbers: true,
  editorBackgroundColor: "rgb(248, 250, 252)",
  selectionHighlightColor: "rgba(66, 133, 244, 0.4)",
  rootEditorTypography: {
    fontFamily: "monlam",
    fontSize: 1.3,
    lineHeight: 1.5,
  },
  translationEditorTypography: {
    fontFamily: "google-sans-regular",
    fontSize: 1.3,
    lineHeight: 1.5,
  }
};

export function useDisplaySettings() {
  const [settings, setSettings] = useLocalStorage<DisplaySettings>(
    "editor-display-settings",
    DEFAULT_DISPLAY_SETTINGS
  );
  const updateSetting = <K extends keyof DisplaySettings>(
    key: K,
    value: DisplaySettings[K]
  ) => {
    setSettings({ ...settings, [key]: value });
  };

  const updateRootTypography = <K extends keyof TypographySettings>(
    key: K,
    value: TypographySettings[K]
  ) => {
    setSettings({
      ...settings,
      rootEditorTypography: {
        ...settings.rootEditorTypography,
        [key]: value
      }
    });
  };

  const updateTranslationTypography = <K extends keyof TypographySettings>(
    key: K,
    value: TypographySettings[K]
  ) => {
    setSettings({
      ...settings,
      translationEditorTypography: {
        ...settings.translationEditorTypography,
        [key]: value
      }
    });
  };

  const resetToDefaults = () => {
    const darkColorBackground= "rgb(64, 71, 79)"
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    if(isDark){
      DEFAULT_DISPLAY_SETTINGS.editorBackgroundColor = darkColorBackground;
      setSettings(DEFAULT_DISPLAY_SETTINGS);
    }else{
      setSettings(DEFAULT_DISPLAY_SETTINGS);
    }
  };

  // Apply CSS custom properties for dynamic styling
  useEffect(() => {
    const root = document.documentElement;
    
    // Set CSS custom properties for global access
    root.style.setProperty('--color-editor-background', settings.editorBackgroundColor);
    root.style.setProperty('--selection-highlight-color', settings.selectionHighlightColor);
    
    // Root Editor Typography
    const rootFontFamily = settings.rootEditorTypography?.fontFamily === "google-sans-regular" 
      ? "google-sans" 
      : settings.rootEditorTypography?.fontFamily;
    root.style.setProperty('--root-editor-font-family', rootFontFamily);
    root.style.setProperty('--root-editor-font-size', `${settings.rootEditorTypography?.fontSize}rem`);
    root.style.setProperty('--root-editor-line-height', settings.rootEditorTypography?.lineHeight.toString());
    
    // Translation Editor Typography
    const translationFontFamily = settings.translationEditorTypography?.fontFamily === "google-sans-regular" 
      ? "google-sans" 
      : settings.translationEditorTypography?.fontFamily;
    root.style.setProperty('--translation-editor-font-family', translationFontFamily);
    root.style.setProperty('--translation-editor-font-size', `${settings.translationEditorTypography?.fontSize}rem`);
    root.style.setProperty('--translation-editor-line-height', settings.translationEditorTypography?.lineHeight.toString());

    // Line numbers visibility class
    if (settings.showLineNumbers) {
      root.classList.add('show-line-numbers');
      root.classList.remove('hide-line-numbers');
    } else {
      root.classList.add('hide-line-numbers');
      root.classList.remove('show-line-numbers');
    }

  }, [settings]);

  return {
    settings,
    updateSetting,
    updateRootTypography,
    updateTranslationTypography,
    resetToDefaults,
    // Convenience getters
    showLineNumbers: settings.showLineNumbers,
    editorBackgroundColorLight: settings.editorBackgroundColorLight,
    selectionHighlightColor: settings.selectionHighlightColor,
    rootEditorTypography: settings.rootEditorTypography,
    translationEditorTypography: settings.translationEditorTypography,
  };
}
