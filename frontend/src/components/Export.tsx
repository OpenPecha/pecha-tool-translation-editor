import { Button } from "./ui/button";
import { useMutation } from "@tanstack/react-query";
import { downloadProjectDocuments, server_url } from "@/api/project";
import { useState } from "react";
import { Download, ChevronDown, HelpCircle } from "lucide-react";
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
import { useCurrentDocTranslations } from "@/hooks/useCurrentDoc";
import { useParams } from "react-router-dom";

export type exportStyle =
  | "line-by-line"
  | "side-by-side"
  | "pecha-pdf"
  | "docx-template";

interface Document {
  id: string;
  name: string;
  type: "root" | "translation";
  language: string;
  parentName?: string;
}

interface PechaPdfDocumentSelectorProps {
  projectId: string;
  selectedDocumentId: string;
  onDocumentSelect: (documentId: string) => void;
}

function PechaPdfDocumentSelector({
  selectedDocumentId,
  onDocumentSelect,
}: Omit<PechaPdfDocumentSelectorProps, "projectId">) {
  // Fetch documents for pecha-pdf selection
  const { id } = useParams();
  const rootId = id as string;
  const { translations } = useCurrentDocTranslations(rootId);
  const documents = [
    { id: rootId, name: "root", type: "root", language: "en" },
    ...translations,
  ];
  const documentsLoading = !translations;
  return (
    <div className="flex flex-col gap-3">
      {documentsLoading ? (
        <div className="text-sm text-gray-500 animate-pulse">
          Loading documents...
        </div>
      ) : (
        <Select value={selectedDocumentId} onValueChange={onDocumentSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a document to export" />
            <ChevronDown className="w-4 h-4 opacity-50" />
          </SelectTrigger>
          <SelectContent>
            {documents.map((doc: Document) => (
              <SelectItem key={doc.id} value={doc.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{doc.name}</span>
                  <span className="text-xs text-gray-500">
                    {doc.type === "translation"
                      ? `${doc.language} translation`
                      : "Original"}
                    {doc.parentName ? ` of ${doc.parentName}` : ""}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

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
  const [exportFormat, setExportFormat] = useState<exportStyle>("side-by-side");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>(rootId);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportMessage, setExportMessage] = useState<string>("");

  const { mutate: downloadZip, isPending } = useMutation({
    mutationFn: async () => {
      if (exportFormat === "pecha-pdf" || exportFormat === "docx-template") {
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

        progressEventSource.onopen = (event) => {
          console.log("✅ SSE connection opened:", event);
          sseConnectionReady = true;
        };

        progressEventSource.onmessage = (event) => {
          console.log("📩 SSE message received:", event.data);
          try {
            const data = JSON.parse(event.data);
            console.log("📊 Progress update:", data);
            setExportProgress(data.progress);
            setExportMessage(data.message);
          } catch (error) {
            console.error("❌ Error parsing progress data:", error);
          }
        };

        progressEventSource.onerror = (error) => {
          console.error("❌ SSE connection error:", error);
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
          const blob =
            exportFormat === "pecha-pdf" && selectedDocumentId
              ? await downloadProjectDocuments(
                  projectId,
                  exportFormat,
                  selectedDocumentId,
                  progressId
                )
              : await downloadProjectDocuments(
                  projectId,
                  exportFormat,
                  undefined,
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
        // For non-progress exports (side-by-side, line-by-line), use the regular method
        return downloadProjectDocuments(projectId, exportFormat);
      }
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const suffix =
        exportFormat === "pecha-pdf" && selectedDocumentId
          ? "_pecha_pdf"
          : exportFormat === "docx-template"
          ? "_docx_template"
          : "_documents";
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
    if (exportFormat === "pecha-pdf" && !selectedDocumentId) {
      alert("Please select a document for pecha-pdf export.");
      return;
    }
    setIsExporting(true);
    downloadZip();
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col w-full gap-6">
        <RadioGroup
          value={exportFormat}
          onValueChange={(value: exportStyle) => setExportFormat(value)}
          className="flex-1 space-y-4"
        >
          <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <RadioGroupItem
              value="side-by-side"
              id="side-by-side"
              className="mt-1"
            />
            <Label htmlFor="side-by-side" className="cursor-pointer flex-1">
              <div>
                <div className="font-medium text-gray-700 flex items-center gap-2">
                  Side by Side
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <div className="p-2">
                        <img
                          src="/previews/side-by-side.png"
                          alt="Side by Side Preview"
                          className="w-64 h-40 object-contain rounded mb-2"
                          onLoad={() => {
                            console.log(
                              "✅ Side by side image loaded successfully"
                            );
                          }}
                          onError={(e) => {
                            console.error(
                              "❌ Side by side image failed to load:",
                              e
                            );
                            console.log(
                              "Attempted to load:",
                              e.currentTarget.src
                            );
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = "none";
                            const fallbackDiv =
                              target.nextElementSibling as HTMLElement;
                            if (fallbackDiv) {
                              fallbackDiv.classList.remove("hidden");
                              fallbackDiv.textContent = `Failed to load: ${target.src}`;
                            }
                          }}
                        />
                        <div className="text-xs text-gray-600 text-center hidden">
                          Preview image not available
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                          Side by Side Layout
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Source and translation in columns
                </div>
              </div>
            </Label>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <RadioGroupItem
              value="line-by-line"
              id="line-by-line"
              className="mt-1"
            />
            <Label htmlFor="line-by-line" className="cursor-pointer flex-1">
              <div>
                <div className="font-medium text-gray-700 flex items-center gap-2">
                  Line by Line
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <div className="p-2">
                        <img
                          src="/previews/line-by-line.png"
                          alt="Line by Line Preview"
                          className="w-64 h-40 object-contain rounded mb-2"
                          onLoad={() => {
                            console.log(
                              "✅ Line by line image loaded successfully"
                            );
                          }}
                          onError={(e) => {
                            console.error(
                              "❌ Line by line image failed to load:",
                              e
                            );
                            console.log(
                              "Attempted to load:",
                              e.currentTarget.src
                            );
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = "none";
                            const fallbackDiv =
                              target.nextElementSibling as HTMLElement;
                            if (fallbackDiv) {
                              fallbackDiv.classList.remove("hidden");
                              fallbackDiv.textContent = `Failed to load: ${target.src}`;
                            }
                          }}
                        />
                        <div className="text-xs text-gray-600 text-center hidden">
                          Preview image not available
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                          Line by Line Layout
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Alternating source and translation lines
                </div>
              </div>
            </Label>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <RadioGroupItem
              value="docx-template"
              id="docx-template"
              className="mt-1"
            />
            <Label htmlFor="docx-template" className="cursor-pointer flex-1">
              <div>
                <div className="font-medium text-gray-700">Docx-template</div>
                <div className="text-sm text-gray-500 mt-1">docx-template</div>
              </div>
            </Label>
          </div>
        </RadioGroup>

        {/* Document selection for pecha-pdf only */}
        {exportFormat === "pecha-pdf" && (
          <PechaPdfDocumentSelector
            selectedDocumentId={selectedDocumentId}
            onDocumentSelect={setSelectedDocumentId}
          />
        )}

        <Button
          onClick={exportZip}
          className="w-full py-6 text-base font-medium transition-all hover:shadow-md"
          disabled={isPending || isExporting}
        >
          <Download className="w-5 h-5 mr-2" />
          {isPending || isExporting ? (
            <div className="flex flex-col items-center">
              {exportFormat === "pecha-pdf" ||
              exportFormat === "docx-template" ? (
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
                <span className="animate-pulse">Downloading...</span>
              )}
            </div>
          ) : (
            "Download"
          )}
        </Button>
      </div>
    </TooltipProvider>
  );
}

export default ExportButton;
