import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModelSelector } from "@/components/ui/ModelSelector";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Settings,
  Globe,
  Languages,
  FileText,
  Bot,
  Hash,
  MessageSquare,
  BookOpen,
  Lightbulb,
} from "lucide-react";

import {
  TARGET_LANGUAGES,
  TEXT_TYPES,
  TargetLanguage,
  TextType,
  ModelName,
} from "@/api/translate";
import { useTranslation } from "react-i18next";

interface TranslationConfig {
  targetLanguage: TargetLanguage;
  textType: TextType;
  modelName: ModelName;
  batchSize: number;
  userRules: string;
  extractGlossary: boolean;
}

interface SettingsModalProps {
  config: TranslationConfig;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigChange: <K extends keyof TranslationConfig>(
    key: K,
    value: TranslationConfig[K]
  ) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  config,
  isOpen,
  onOpenChange,
  onConfigChange,
}) => {
  const { t } = useTranslation();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 rounded-md"
          title={t("translation.translationSettings")}
        >
          <Settings className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-secondary-600" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              {t("translation.translationSettings")}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Core Settings */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Target Language */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Languages className="w-3 h-3" />
                  {t("translation.targetLanguage")}
                </Label>
                <Select
                  value={config.targetLanguage}
                  onValueChange={(value: TargetLanguage) =>
                    onConfigChange("targetLanguage", value)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Text Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  {t("translation.contentType")}
                </Label>
                <Select
                  value={config.textType}
                  onValueChange={(value: TextType) =>
                    onConfigChange("textType", value)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEXT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="user-rules"
              className="text-sm font-medium flex items-center gap-2"
            >
              <MessageSquare className="w-3 h-3" />
              {t("translation.translationGuidelines")}
            </Label>
            <Textarea
              id="user-rules"
              placeholder="Enter specific instructions for the AI translator (e.g., 'Maintain formal tone', 'Preserve technical terms', etc.)"
              value={config.userRules}
              onChange={(e) => onConfigChange("userRules", e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <p className="text-xs">
              {t("translation.translationGuidelinesDescription")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
