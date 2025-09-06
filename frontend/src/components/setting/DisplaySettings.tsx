import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslate } from "@tolgee/react";
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
  const backgroundColorOptions = [
    { value: "#ffffff", label: "White", preview: "#ffffff" },
    { value: "#fefefe", label: "Off-White", preview: "#fefefe" },
    { value: "#f8f9fa", label: "Light Gray", preview: "#f8f9fa" },
    { value: "#f5f5f0", label: "Cream", preview: "#f5f5f0" },
    { value: "#eaeaea", label: "Soft Gray", preview: "#eaeaea" },
    { value: "#fdf6e3", label: "Solarized Light", preview: "#fdf6e3" },
  ];
  

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
    <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
      <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">
            {t("settings.fontFamily", "Font Family")}
          </Label>
          <Select
            value={typography.fontFamily}
            onValueChange={(value: TypographySettings["fontFamily"]) =>
              onUpdate("fontFamily", value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontFamilyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">
            {t("settings.fontSize", "Font Size")} ({typography.fontSize}rem)
          </Label>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
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
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdate("fontSize", Math.min(2.0, typography.fontSize + 0.1))}
              disabled={typography.fontSize >= 2.0}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">
            {t("settings.lineHeight", "Line Height")} ({typography.lineHeight})
          </Label>
          <Input
            type="range"
            min="1.2"
            max="2.0"
            step="0.1"
            value={typography.lineHeight}
            onChange={(e) => onUpdate("lineHeight", parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  )};


  return (
    <div className="space-y-6">
      {/* Line Numbers & Visual Elements */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <Eye className="w-4 h-4 text-gray-600" />
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
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <Palette className="w-4 h-4 text-gray-600" />
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
                      ? "border-blue-500 bg-blue-50"
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
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <Type className="w-4 h-4 text-gray-600" />
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
