import { Button } from "./ui/button";
import { useMutation } from "@tanstack/react-query";
import { downloadProjectDocuments, server_url } from "@/api/project";
import { useState } from "react";
import { BookOpen, Download, HelpCircle } from "lucide-react";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { useTranslate } from "@tolgee/react";

export type ExportMode = "single" | "with_translation";
export type ExportFormat =
  | "side-by-side"
  | "line-by-line"
  | "pecha-template"
  | "page-view"
  | "single-pecha-templates";

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
    label: "Single",
    value: "single",
    formatOptions: [
      {
        label: "Page View",
        value: "page-view",
        description: "View in page view",
      },
      {
        label: "Pecha Template",
        value: "single-pecha-templates",
        description: "View in pecha format",
      },
    ],
  },
  {
    label: "With Translation",
    value: "with_translation",
    formatOptions: [
      {
        label: "Side by Side",
        value: "side-by-side",
        img: "/previews/side-by-side.png",
        description: "Source and translation in columns",
      },
      {
        label: "Line by Line",
        value: "line-by-line",
        img: "/previews/line-by-line.png",
        description: "Alternating source and translation lines",
      },
      {
        label: "Pecha template",
        value: "pecha-template",
        description: "View in pecha format",
      },
    ],
  },
];

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
  const { t } = useTranslate();
  // Update export format when mode changes
  const handleExportModeChange = (value: ExportMode) => {
    setExportMode(value);
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
        console.log("🔗 SSE URL:", sseUrl);

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
          console.log("SSE readyState:", progressEventSource.readyState);
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
                console.log("⏰ SSE connection timeout, proceeding anyway");
                resolve(true);
              }, 5000);
            }
          });
        };

        await waitForConnection();
        console.log("🚀 Starting export after SSE connection established");

        try {
          // Start the download with progress tracking
          const blob = await downloadProjectDocuments(
            projectId,
            actualExportType,
            exportMode === "single" ? undefined : rootId,
            progressId
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
        return downloadProjectDocuments(projectId, actualExportType);
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
        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-900">
            {t("export.exportMode")}
          </div>
          <RadioGroup
            value={exportMode}
            onValueChange={(value) =>
              handleExportModeChange(value as ExportMode)
            }
            className="space-y-3"
          >
            {ExportModeOptions.map((mode) => (
              <div key={mode.label} className="flex items-start space-x-3">
                <RadioGroupItem
                  value={mode.value}
                  id={mode.value}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor={mode.value}
                    className="text-sm font-medium text-gray-900 cursor-pointer"
                  >
                    {mode.label}
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    {mode.value === "single"
                      ? "Export all documents as individual files"
                      : "Export source content with translations"}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Format Options based on selected mode */}
        {formatOptions.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-900 mb-2">
              {t("export.exportFormat")}
            </div>
            <RadioGroup
              value={exportFormat}
              onValueChange={(value) => setExportFormat(value as ExportFormat)}
              className="space-y-3"
            >
              {formatOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-start space-x-3 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label
                    htmlFor={option.value}
                    className="cursor-pointer flex-1"
                  >
                    <div>
                      <div className="font-medium text-gray-700 flex items-center gap-2">
                        {option.label}
                        {option?.img && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="p-2">
                                <img
                                  src={option.img}
                                  alt={`${option.label} Preview`}
                                  className="w-64 h-40 object-contain rounded mb-2"
                                />
                                <div className="text-xs text-gray-500 text-center">
                                  {option.label} Layout
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {option.description}
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Preview Card */}
        <Card className="bg-gray-50 border-gray-200 !p-2">
          <CardContent className="capitalize">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <BookOpen className="w-4 h-4" />
              <span>
                Selected:{" "}
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
          className="w-full py-6 text-base font-medium transition-all hover:shadow-md"
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
                    <span className="text-xs text-gray-500 mt-1">
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
            <span className="capitalize">{t("common.download")}</span>
          )}
        </Button>
      </div>
    </TooltipProvider>
  );
}

export default ExportButton;
