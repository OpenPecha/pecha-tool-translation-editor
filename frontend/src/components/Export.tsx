import { Button } from "./ui/button";
import { useMutation } from "@tanstack/react-query";
import { downloadProjectDocuments } from "@/api/project";
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

export type exportStyle = "line-by-line" | "side-by-side" | "pecha-pdf";

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

  const { mutate: downloadZip, isPending } = useMutation({
    mutationFn: () => {
      if (exportFormat === "pecha-pdf" && selectedDocumentId) {
        return downloadProjectDocuments(
          projectId,
          exportFormat,
          selectedDocumentId
        );
      }
      return downloadProjectDocuments(projectId, exportFormat);
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const suffix =
        exportFormat === "pecha-pdf" && selectedDocumentId
          ? "_pecha_pdf"
          : "_documents";
      a.download = `${projectName}${suffix}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExporting(false);
    },
    onError: (error) => {
      console.error("Error downloading project documents:", error);
      alert("Failed to download project documents. Please try again.");
      setIsExporting(false);
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
            <RadioGroupItem value="pecha-pdf" id="pecha-pdf" className="mt-1" />
            <Label htmlFor="pecha-pdf" className="cursor-pointer flex-1">
              <div>
                <div className="font-medium text-gray-700">Pecha PDF</div>
                <div className="text-sm text-gray-500 mt-1">
                  pecha view in a PDF
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>

        {/* Document selection for pecha-pdf */}
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
            <span className="animate-pulse">Downloading...</span>
          ) : (
            "Download"
          )}
        </Button>
      </div>
    </TooltipProvider>
  );
}

export default ExportButton;
