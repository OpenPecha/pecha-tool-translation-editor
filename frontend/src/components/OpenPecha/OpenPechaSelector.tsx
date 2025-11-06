import {
  AlertCircle,
  CheckCircle,
  Languages,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SearchableDropdown } from "../Dashboard/DocumentCreateModal/SearchableDropdown";

interface DropdownOption {
  value: string;
  label: string;
  subtitle?: string;
}

interface OpenPechaSelectorProps {
  // Values
  selectedTextId: string;
  selectedInstanceId: string;
  processedText: string;
  texts: any[];
  
  // Options
  textOptions: DropdownOption[];
  instanceOptions: DropdownOption[];

  // Loading states
  textsLoading: boolean;
  instancesLoading: boolean;
  textContentLoading: boolean;

  // Error states
  textsError: Error | null;
  instancesError: Error | null;
  textContentError: Error | null;
  annotationsLoading: boolean;
  annotationsError: Error | null;
  // Setters
  setSelectedTextId: (value: string) => void;
  setSelectedInstanceId: (value: string) => void;

  // Helpers
  extractTitle: (title: any, fallback?: string) => string;
}

export function OpenPechaSelector({
  selectedTextId,
  selectedInstanceId,
  processedText,
  texts,
  textOptions,
  instanceOptions,
  textsLoading,
  instancesLoading,
  textContentLoading,
  textsError,
  instancesError,
  textContentError,
  annotationsLoading,
  annotationsError,
  setSelectedTextId,
  setSelectedInstanceId,
  extractTitle,
}: OpenPechaSelectorProps) {
  const { t } = useTranslation();

  const getWordCount = (text: string): number => {
    return text ? text.trim().split(/\s+/).length : 0;
  };

  const getLineCount = (text: string): number => {
    return text ? text.split("\n").length : 0;
  };

  return (
    <div className="space-y-8">
      {/* Text Selection */}
      <SearchableDropdown
        label={t("openPecha.text")}
        placeholder={t("openPecha.searchText")}
        options={textOptions}
        value={selectedTextId}
        onChange={setSelectedTextId}
        loading={textsLoading}
        error={textsError?.message}
      />

      {/* Instance Selection */}
      <div className="flex gap-4">
        {selectedTextId && (
          <div className="flex-1">
            <SearchableDropdown
              label={t("openPecha.instance")}
              placeholder={t("openPecha.selectInstance")}
              options={instanceOptions}
              value={selectedInstanceId}
              onChange={setSelectedInstanceId}
              loading={instancesLoading}
              error={instancesError?.message}
            />
          </div>
        )}
      </div>

      {/* Text Preview */}
      {selectedInstanceId && (
        <>
          {textContentLoading || annotationsLoading ? (
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("openPecha.loadingTextContent")}</span>
                </div>
              </CardContent>
            </Card>
          ) : textContentError || annotationsError ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    {t("openPecha.errorLoadingText")}:{" "}
                    {textContentError?.message || annotationsError?.message}
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : processedText ? (
            <div className="space-y-1">
              {/* Content Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-medium text-secondary-900">
                      {extractTitle(
                        texts.find((text) => text.id === selectedTextId)
                          ?.title,
                        selectedTextId
                      )}
                    </h3>
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">
                      {t("openPecha.contentLoaded")}
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap gap-4 text-sm text-secondary-700">
                    <div className="flex items-center">
                      <Languages className="h-4 w-4"/>
                      <span>
                        : {texts.find((text) => text.id === selectedTextId)?.language}
                      </span>
                    </div>
                    <div>
                      {t("common.words")}: {getWordCount(processedText)}
                    </div>
                    <div>
                      {t("common.lines")}: {getLineCount(processedText)}
                    </div>
                  </div>
                </div>

                <Textarea
                  value={processedText}
                  rows={12}
                  readOnly
                  className="font-monlam resize-none border-gray-300 bg-gray-50 text-sm leading-relaxed"
                  placeholder={t("openPecha.processedTextWillAppearHere")}
                />
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-500">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                  <p>{t("openPecha.noTextContentAvailable")}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
