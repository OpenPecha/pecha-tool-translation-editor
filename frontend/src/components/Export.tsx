import { GoFileZip } from "react-icons/go";
import { Button } from "./ui/button";
import { useMutation } from "@tanstack/react-query";
import { downloadProjectDocuments } from "@/api/project";
import { useState } from "react";
function ExportButton({
  projectId,
  projectName,
}: {
  readonly projectId: string;
  readonly projectName: string;
}) {
  const [isExporting, setIsExporting] = useState(false);

  // Use react-query mutation for downloading project documents
  const { mutate: downloadZip, isPending } = useMutation({
    mutationFn: () => downloadProjectDocuments(projectId),
    onSuccess: (blob) => {
      // Create a download link and trigger the download
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
    <div className="flex justify-between items-center w-full">
      <div className="text-sm font-medium text-gray-500">Export</div>
      <div>
        <Button
          variant={"ghost"}
          onClick={exportZip}
          title="Download all documents as ZIP"
          className={"cursor-pointer"}
          disabled={isPending || isExporting}
        >
          {isPending || isExporting ? (
            <span className="animate-pulse">Downloading...</span>
          ) : (
            <GoFileZip color="#454746" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default ExportButton;
