import { Button } from "./ui/button";
import { useMutation } from "@tanstack/react-query";
import { downloadProjectDocuments, server_url } from "@/api/project";
import { useState, useEffect } from "react";
import { BookOpen, Download, HelpCircle } from "lucide-react";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { useTranslate } from "@tolgee/react";
import { useCurrentDocTranslations, Translation } from "@/hooks/useCurrentDoc";

export type ExportMode = "single" | "with_translation";
export type ExportFormat =
  | "side-by-side"
  | "line-by-line"
  | "pecha-template"
  | "page-view"
  | "single-pecha-templates";

function ExportButton({
  projectId,
  projectName,
}: {
  readonly projectId: string;
  readonly projectName: string;
}) {
  const { id } = useParams();
  const rootId = id as string;
  const [isExporting, setIsExporting] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>("single");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("page-view");
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportMessage, setExportMessage] = useState<string>("");
  const [selectedTranslation, setSelectedTranslation] = useState<string>("all");
  const [showTranslationError, setShowTranslationError] = useState(false);
  const { t } = useTranslate();

  // Fetch available translations for the root document
  const { translations, loading: translationsLoading } =
    useCurrentDocTranslations(rootId);

  const ExportModeOptions: {
    label: string;
    value: ExportMode;
    formatOptions: {
      label: string;
      value: ExportFormat;
      img?: string;
      description: string;
    }[];
  }[] = [
    {
      label: t("export.single"),
      value: "single",
      formatOptions: [
        {
          label: t("export.pageView"),
          value: "page-view",
          description: t("export.viewInPageView"),
        },
        {
          label: t("export.pechaTemplate"),
          value: "single-pecha-templates",
          description: t("export.useMicrosoftWordToOpenTemplate"),
        },
      ],
    },
    {
      label: t("export.withTranslation"),
      value: "with_translation",
      formatOptions: [
        {
          label: t("export.sideBySide"),
          value: "side-by-side",
          img: "/previews/side-by-side.png",
          description: t("export.sourceAndTranslationInColumns"),
        },
        {
          label: t("export.lineByLine"),
          value: "line-by-line",
          img: "/previews/line-by-line.png",
          description: t("export.alternatingSourceAndTranslationLines"),
        },
        {
          label: t("export.pechaTemplate"),
          value: "pecha-template",
          description: t("export.useMicrosoftWordToOpenTemplate"),
        },
      ],
    },
  ];
  // Handle translation selection logic
  useEffect(() => {
    if (translations && translations.length > 0) {
      if (translations.length === 1) {
        // Auto-select single translation
        setSelectedTranslation(translations[0].id);
      } else {
        // Default to "all" for multiple translations
        setSelectedTranslation("all");
      }
    } else {
      // Reset to "all" if no translations
      setSelectedTranslation("all");
    }
  }, [translations]);

  // Clear translation error when translations become available or mode changes
  useEffect(() => {
    if (translations && translations.length > 0) {
      setShowTranslationError(false);
    }
    if (exportMode !== "with_translation") {
      setShowTranslationError(false);
    }
  }, [translations, exportMode]);

  // Update export format when mode changes
  const handleExportModeChange = (value: ExportMode) => {
    setExportMode(value);
    // Reset translation selection when switching away from with_translation
    if (value !== "with_translation") {
      setShowTranslationError(false);
    }
    // Set default format based on mode
    if (value === "single") {
      setExportFormat("page-view");
    } else {
      setExportFormat("side-by-side");
    }
  };

  const { mutate: downloadZip, isPending } = useMutation({
    mutationFn: async () => {
      // Determine the actual export type based on mode and format
      let actualExportType: string = exportFormat;

      if (exportMode === "single") {
        if (exportFormat === "pecha-template") {
          actualExportType = "single-pecha-templates";
        } else if (exportFormat === "page-view") {
          actualExportType = "page-view";
        }
      } else {
        // with_translation mode - use the format as is
        actualExportType = exportFormat;
      }

      // Determine if we need progress tracking
      const needsProgress =
        actualExportType === "pecha-template" ||
        actualExportType === "single-pecha-templates" ||
        actualExportType === "page-view";

      if (needsProgress) {
        // Generate unique progress ID
        const progressId = `export_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        // Start SSE connection for progress updates (no authentication needed)
        const sseUrl =
          server_url + `/projects/${projectId}/export-progress/${progressId}`;

        const progressEventSource = new EventSource(`${sseUrl}`);

        let sseConnectionReady = false;

        progressEventSource.onopen = () => {
          sseConnectionReady = true;
        };

        progressEventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setExportProgress(data.progress);
            setExportMessage(data.message);
          } catch (error) {
            console.error("❌ Error parsing progress data:", error);
          }
        };

        progressEventSource.onerror = () => {
          progressEventSource.close();
        };

        // Wait for SSE connection to be established before starting export
        const waitForConnection = () => {
          return new Promise((resolve) => {
            if (sseConnectionReady) {
              resolve(true);
            } else {
              const checkInterval = setInterval(() => {
                if (sseConnectionReady) {
                  clearInterval(checkInterval);
                  resolve(true);
                }
              }, 100);

              // Timeout after 5 seconds
              setTimeout(() => {
                clearInterval(checkInterval);
                resolve(true);
              }, 5000);
            }
          });
        };

        await waitForConnection();

        try {
          // Determine translationId to pass to the API
          let translationId: string | undefined;
          if (
            exportMode === "with_translation" &&
            selectedTranslation !== "all"
          ) {
            translationId = selectedTranslation;
          }

          // Start the download with progress tracking
          const blob = await downloadProjectDocuments(
            projectId,
            actualExportType,
            exportMode === "single" ? undefined : rootId,
            progressId,
            translationId
          );

          // Close the SSE connection
          progressEventSource.close();

          // Reset progress
          setExportProgress(100);
          setExportMessage("Download complete!");

          return blob;
        } catch (error) {
          progressEventSource.close();
          throw error;
        }
      } else {
        // For non-progress exports, use the regular method
        // Determine translationId to pass to the API
        let translationId: string | undefined;
        if (
          exportMode === "with_translation" &&
          selectedTranslation !== "all"
        ) {
          translationId = selectedTranslation;
        }

        return downloadProjectDocuments(
          projectId,
          actualExportType,
          undefined,
          undefined,
          translationId
        );
      }
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Generate appropriate filename based on mode and format
      let suffix = "_documents";
      if (exportMode === "single") {
        if (exportFormat === "pecha-template") {
          suffix = "_pecha_templates";
        } else if (exportFormat === "page-view") {
          suffix = "_page_view";
        } else {
          suffix = "_documents";
        }
      } else {
        // with_translation mode
        if (exportFormat === "pecha-template") {
          suffix = "_pecha_template";
        } else if (exportFormat === "side-by-side") {
          suffix = "_side_by_side";
        } else if (exportFormat === "line-by-line") {
          suffix = "_line_by_line";
        }
      }

      a.download = `${projectName}${suffix}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExporting(false);

      // Reset progress after successful download
      setTimeout(() => {
        setExportProgress(0);
        setExportMessage("");
      }, 2000);
    },
    onError: (error) => {
      console.error("Error downloading project documents:", error);
      alert("Failed to download project documents. Please try again.");
      setIsExporting(false);
      setExportProgress(0);
      setExportMessage("");
    },
  });

  const exportZip = () => {
    // Check if user is trying to export with translation but no translations are available
    if (
      exportMode === "with_translation" &&
      (!translations || translations.length === 0)
    ) {
      setShowTranslationError(true);
      // Auto-clear the error after 3 seconds
      setTimeout(() => {
        setShowTranslationError(false);
      }, 3000);
      return; // Stop the export process
    }

    setIsExporting(true);
    downloadZip();
  };

  // Get the current mode's format options
  const currentMode = ExportModeOptions.find(
    (mode) => mode.value === exportMode
  );
  const formatOptions = currentMode?.formatOptions || [];

  return (
    <TooltipProvider>
      <div className="flex flex-col w-full gap-2 ">
        {/* Export Mode Selection */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {t("export.exportMode")}
          </div>
          <RadioGroup
            value={exportMode}
            onValueChange={(value) =>
              handleExportModeChange(value as ExportMode)
            }
            className="space-y-1 gap-2"
          >
            {ExportModeOptions.map((mode) => (
              <div key={mode.label} className="flex items-start space-x-3">
                <RadioGroupItem
                  value={mode.value}
                  id={mode.value}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label
                        htmlFor={mode.value}
                        className="text-sm font-medium text-neutral-800 dark:text-neutral-100 cursor-pointer"
                      >
                        {mode.label}
                      </Label>
                      {mode.value === "single" ? (
                        <p className="text-sm text-neutral-800 dark:text-neutral-100 mt-1">
                          {t("export.exportAllDocumentsAsIndividualFiles")}
                        </p>
                      ) : (
                        // Translation Dropdown replaces the description text for with_translation mode
                        <div className="">
                          <Select
                            value={
                              translations && translations.length > 0
                                ? selectedTranslation
                                : "none"
                            }
                            onValueChange={setSelectedTranslation}
                            disabled={
                              exportMode !== "with_translation" ||
                              translationsLoading
                            }
                          >
                            <SelectTrigger
                              className={`h-6 text-sm min-w-[250px] max-w-[300px] transition-all duration-200 ${
                                showTranslationError
                                  ? "border-red-500 animate-pulse shadow-md shadow-red-200"
                                  : ""
                              }`}
                            >
                              <SelectValue
                                placeholder={t("export.selectTranslation")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Default "All translations" option */}
                              {translations && translations.length > 1 && (
                                <SelectItem value="all">
                                  {t("export.allTranslations")}
                                </SelectItem>
                              )}

                              {/* Individual translation options */}
                              {translations && translations.length > 0 ? (
                                translations.map((translation: Translation) => (
                                  <SelectItem
                                    key={translation.id}
                                    value={translation.id}
                                  >
                                    {translation.name ||
                                      translation.language ||
                                      `Translation ${translation.id.slice(
                                        0,
                                        8
                                      )}`}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>
                                  {translationsLoading
                                    ? t("common.loading")
                                    : t("export.noTranslationsFound")}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {/* Error message for no translations */}
                          {showTranslationError && (
                            <p className="text-red-500 text-xs mt-1 animate-fade-in">
                              {t(
                                "export.pleaseAddTranslationsBeforeExportingWithTranslationMode"
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Format Options based on selected mode */}
        {formatOptions.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100 mb-2">
              {t("export.exportFormat")}
            </div>
            <RadioGroup
              value={exportFormat}
              onValueChange={(value) => setExportFormat(value as ExportFormat)}
              className="space-y-1"
            >
              {formatOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-start space-x-3 px-3 py-1 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label
                    htmlFor={option.value}
                    className="cursor-pointer flex-1"
                  >
                    <div>
                      <div className="font-medium text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                        {option.label}
                        {option?.img && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-4 h-4 text-neutral-800 dark:text-neutral-100 hover:text-neutral-600 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="p-2">
                                <img
                                  src={option.img}
                                  alt={`${option.label} Preview`}
                                  className="w-64 h-40 object-contain rounded mb-2"
                                />
                                <div className="text-xs text-neutral-800 dark:text-neutral-100 text-center">
                                  {option.label} {t("export.layout")}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="text-sm text-neutral-800 dark:text-neutral-100 mt-1">
                        {option.description}
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* MS Word Compatibility Message for Pecha Templates */}
        {(exportFormat === "pecha-template" ||
          exportFormat === "single-pecha-templates") && (
          <Card className="bg-secondary-50 dark:bg-neutral-800 border-secondary-200 dark:border-neutral-400 !p-3">
            <CardContent>
              <div className="flex items-start space-x-2 text-sm text-secondary-800">
                <HelpCircle className="w-4 h-4 mt-0.5 text-secondary-600" />
                <div>
                  <div className="text-secondary-700">
                    {t(
                      "export.pechaTemplateExportsAreCompatibleWithMicrosoftWordOnly"
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview Card */}
        <Card className="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-400 !p-2">
          <CardContent className="capitalize">
            <div className="flex items-center space-x-2 text-sm text-neutral-800 dark:text-neutral-100">
              <BookOpen className="w-4 h-4" />
              <span>
                {t("export.selected")}:{" "}
                {
                  ExportModeOptions.find((mode) => mode.value === exportMode)
                    ?.label
                }
                -
                {
                  ExportModeOptions.find(
                    (mode) => mode.value === exportMode
                  )?.formatOptions.find(
                    (option) => option.value === exportFormat
                  )?.label
                }
              </span>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={exportZip}
          className="w-full py-6 text-base font-medium transition-all hover:shadow-md text-neutral-800 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-400"
          disabled={isPending || isExporting}
        >
          <Download className="w-5 h-5 mr-2" />
          {isPending || isExporting ? (
            <div className="flex flex-col items-center">
              {exportFormat === "pecha-template" ? (
                <div className="flex flex-col items-center">
                  <span className="text-sm font-medium">
                    {exportProgress > 0 ? `${exportProgress}%` : "Preparing..."}
                  </span>
                  {exportMessage && (
                    <span className="text-xs text-neutral-800 dark:text-neutral-100 mt-1">
                      {exportMessage}
                    </span>
                  )}
                </div>
              ) : (
                <span className="animate-pulse">
                  {t("common.downloading")}...
                </span>
              )}
            </div>
          ) : (
            <span className="capitalize text-neutral-800 dark:text-neutral-100">
              {t("common.download")}
            </span>
          )}
        </Button>
      </div>
    </TooltipProvider>
  );
}

export default ExportButton;
