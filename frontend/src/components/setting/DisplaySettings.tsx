import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslate } from "@tolgee/react";
import { useTheme } from "@/hooks/useTheme";
import { 
  Eye, Type, Palette, 
  RotateCcw, Minus, Plus 
} from "lucide-react";
import { useDisplaySettings, type DisplaySettings, type TypographySettings } from "@/hooks/useDisplaySettings";
const DisplaySettings: React.FC<{}> = ({}) => {
  const { t } = useTranslate();
  const { 
    settings, 
    updateSetting, 
    updateRootTypography,
    updateTranslationTypography,
    resetToDefaults 
  } = useDisplaySettings();
  const {theme} = useTheme();
  function isHtmlTagDark() {
    if (typeof document === "undefined") return false;
    const html = document.documentElement;
    return html.classList.contains("dark");
  }
  const isDark = theme === "dark" || isHtmlTagDark();

  const backgroundColorOptions = isDark ? [
    { value: "#40474F", label: "Dark Gray", preview: "#40474F" },
    { value: "#353D46", label: "Charcoal Gray", preview: "#353D46" },
    { value: "#586674", label: "Slate Gray", preview: "#586674" }
  ] : [
    { value: "#f8fafc", label: "Light Blue Gray", preview: "#f8fafc" },
    { value: "#fffea6", label: "Pale Yellow", preview: "#fffea6" },
    { value: "#a2cbf5", label: "Light Sky Blue", preview: "#a2cbf5" },
  ]
  
  

  const fontFamilyOptions = [
    { value: "google-sans-regular", label: "Google Sans (Default)" },
    { value: "monlam", label: "Monlam (Tibetan)" },
    { value: "serif", label: "Serif" },
    { value: "monospace", label: "Monospace" },
  ];

  // Typography Control Component
  const TypographyControl: React.FC<{
    title: string;
    typography: TypographySettings;
    onUpdate: <K extends keyof TypographySettings>(key: K, value: TypographySettings[K]) => void;
  }> = ({ title, typography, onUpdate }) => {
    console.log(typography);
    return (
      <div className="space-y-3 p-3  border border-neutral-100 dark:border-neutral-700 rounded-lg">
        <div className="text-xs uppercase">{title}</div>
        
        <div className="space-y-3">
          {/* Font Family - Compact Select */}
          <div className="flex items-center justify-start space-x-2 mb-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Font</span>
            </div>
            <Select
              value={typography.fontFamily}
              onValueChange={(value: TypographySettings["fontFamily"]) =>
                onUpdate("fontFamily", value)
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontFamilyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
  
          {/* Font Size - Inline Controls */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Size</span>
              <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">{typography.fontSize}rem</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onUpdate("fontSize", Math.max(0.8, typography.fontSize - 0.1))}
                disabled={typography.fontSize <= 0.8}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <Input
                type="range"
                min="0.8"
                max="2.0"
                step="0.1"
                value={typography.fontSize}
                onChange={(e) => onUpdate("fontSize", parseFloat(e.target.value))}
                className="flex-1 h-2"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onUpdate("fontSize", Math.min(2.0, typography.fontSize + 0.1))}
                disabled={typography.fontSize >= 2.0}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
  
          {/* Line Height - Simple Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Line Height</span>
              <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">{typography.lineHeight}</span>
            </div>
            <Input
              type="range"
              min="1.2"
              max="2.0"
              step="0.1"
              value={typography.lineHeight}
              onChange={(e) => onUpdate("lineHeight", parseFloat(e.target.value))}
              className="w-full h-2"
            />
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="space-y-6">
      {/* Line Numbers & Visual Elements */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Eye className="w-4 h-4" />
          {t("settings.visualElements", "Visual Elements")}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="line-numbers"
              checked={settings.showLineNumbers}
              onCheckedChange={(checked) => updateSetting("showLineNumbers", checked)}
            />
            <Label htmlFor="line-numbers">
              {t("settings.showLineNumbers", "Show Line Numbers")}
            </Label>
          </div>
        </div>
      </div>

      {/* Colors & Themes */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Palette className="w-4 h-4" />
          {t("settings.colorsThemes", "Colors & Themes")}
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t("settings.editorBackground", "Editor Background")}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {backgroundColorOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateSetting("editorBackgroundColor", option.value)}
                  className={`p-2 border rounded-md text-xs hover:border-gray-400 transition-colors ${
                    settings.editorBackgroundColor === option.value
                      ? "border-blue-500 bg-neutral-50 dark:bg-neutral-800"
                      : "border-gray-200"
                  }`}
                >
                  <div
                    className="w-full h-6 rounded mb-1"
                    style={{ backgroundColor: option.preview }}
                  />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t("settings.selectionHighlight", "Selection Highlight Color")}
            </Label>
            <Input
              type="color"
              value={settings.selectionHighlightColor}
              onChange={(e) => updateSetting("selectionHighlightColor", e.target.value)}
              className="w-20 h-10"
            />
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Type className="w-4 h-4" />
          {t("settings.typography", "Typography")}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TypographyControl
            title={t("settings.rootEditorTypography", "Root Editor")}
            typography={settings?.rootEditorTypography}
            onUpdate={updateRootTypography}
          />
          
          <TypographyControl
            title={t("settings.translationEditorTypography", "Translation Editor")}
            typography={settings?.translationEditorTypography}
            onUpdate={updateTranslationTypography}
          />
        </div>

        
      </div>

      {/* Reset Button */}
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          onClick={resetToDefaults}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          {t("settings.resetDefaults", "Reset to Defaults")}
        </Button>
      </div>
    </div>
  );
};

export default DisplaySettings;
