import { Button } from "./ui/button";
import { useMutation } from "@tanstack/react-query";
import { downloadProjectDocuments } from "@/api/project";
import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

export type exportStyle = "line-by-line" | "side-by-side";

function ExportButton({
  projectId,
  projectName,
}: {
  readonly projectId: string;
  readonly projectName: string;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<exportStyle>("side-by-side");
  const { mutate: downloadZip, isPending } = useMutation({
    mutationFn: () => downloadProjectDocuments(projectId, exportFormat),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName}_documents.zip`;
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
    setIsExporting(true);
    downloadZip();
  };

  return (
    <div className="flex flex-col w-full gap-6">
      <div className="flex items-center space-x-2">
        <FileText className="w-5 h-5 text-gray-700" />
        <h3 className="text-lg font-semibold text-gray-800">Export Style</h3>
      </div>

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
              <div className="font-medium text-gray-700">Side by Side</div>
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
              <div className="font-medium text-gray-700">Line by Line</div>
              <div className="text-sm text-gray-500 mt-1">
                Alternating source and translation lines
              </div>
            </div>
          </Label>
        </div>
      </RadioGroup>

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
  );
}

export default ExportButton;
