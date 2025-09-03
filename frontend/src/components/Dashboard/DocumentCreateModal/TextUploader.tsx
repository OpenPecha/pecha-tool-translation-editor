import { useState } from "react";
import { Input } from "@/components/ui/input";
import { QueryObserverResult, useMutation } from "@tanstack/react-query";
import { createDocument } from "@/api/document";
import { MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from "@/utils/Constants";
import { AlertCircle, FileText, Upload } from "lucide-react";

const TextUploader = ({
  isRoot,
  isPublic,
  selectedLanguage,
  setRootId,
  disable,
  rootId,
  refetchTranslations,
  previewMode = false,
  onFileLoaded,
}: {
  isRoot: boolean;
  isPublic: boolean;
  selectedLanguage: string;
  setRootId: (id: string) => void;
  disable?: boolean;
  rootId?: string;
  refetchTranslations?: () => Promise<QueryObserverResult<unknown, Error>>;
  previewMode?: boolean;
  onFileLoaded?: (file: File, content: string) => void;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileSizeError, setFileSizeError] = useState<string>("");

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      const uniqueIdentifier = `${fileNameWithoutExt}-${Date.now()}`;
      formData.append("name", fileNameWithoutExt);
      formData.append("identifier", uniqueIdentifier);
      formData.append("isRoot", isRoot.toString());
      formData.append("isPublic", isPublic.toString());
      formData.append("language", selectedLanguage);
      if (file) {
        formData.append("file", file);
      }
      if (rootId) {
        formData.append("rootId", rootId);
      }
      const response = await createDocument(formData);
      setRootId(response.id);
      return response;
    },
    onError: (error) => {
      console.error("Upload error:", error);
    },
    onSuccess: () => {
      if (refetchTranslations) {
        refetchTranslations();
      }
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear any previous file size errors
    setFileSizeError("");

    // Check if language is selected first
    if (!selectedLanguage || selectedLanguage === "") {
      setFileSizeError("Please select a language before uploading files.");
      e.target.value = "";
      return;
    }

    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Validate file size
      if (selectedFile.size > MAX_FILE_SIZE) {
        const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
        setFileSizeError(
          `File size (${fileSizeMB}MB) exceeds the maximum limit of ${MAX_FILE_SIZE_MB}MB. Please select a smaller file.`
        );
        // Reset the file input to allow user to select a different file
        e.target.value = "";
        return;
      }

      setFile(selectedFile);

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setFileContent(content);

        // In preview mode, call the callback instead of uploading
        if (previewMode && onFileLoaded) {
          onFileLoaded(selectedFile, content);
        } else {
          // Original behavior - upload immediately
          uploadMutation.mutate(selectedFile);
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const errorMessage = (uploadMutation.error as Error)?.message;

  const handleReset = () => {
    setFile(null);
    setFileContent("");
    setFileSizeError(""); // Clear file size error when resetting
    uploadMutation.reset(); // Reset mutation state
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isLanguageDisabled = !selectedLanguage || selectedLanguage === "";
  const isFullyDisabled = disable || uploadMutation.isPending || uploadMutation.isSuccess || isLanguageDisabled;

  return (
    <div className="space-y-4">
      {/* Language validation warning */}
      {isLanguageDisabled && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Please select a language above to upload files</span>
          </div>
        </div>
      )}

      {!file && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="text-file"
              className={`text-sm font-medium ${
                isLanguageDisabled ? "text-gray-400" : "text-gray-700"
              }`}
            >
              Upload {isRoot ? "Root" : "Translation"} Text (.txt)
            </label>
            <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              <FileText className="h-3 w-3" />
              <span>Max {MAX_FILE_SIZE_MB}MB</span>
            </div>
          </div>
          <div className="relative">
            <Input
              id="text-file"
              type="file"
              accept=".txt"
              onChange={handleFileChange}
              disabled={isFullyDisabled}
              className={`cursor-pointer transition-colors ${
                isLanguageDisabled 
                  ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed" 
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Upload className={`h-4 w-4 ${
                isLanguageDisabled ? "text-gray-300" : "text-gray-400"
              }`} />
            </div>
          </div>
        </div>
      )}

      {file && !previewMode && (
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-sm">
                Selected file: <span className="font-medium">{file.name}</span>
              </span>
              <span className="text-xs text-gray-500">
                ({formatFileSize(file.size)})
              </span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-red-600 text-xs underline hover:text-red-800 transition-colors"
            >
              Remove File
            </button>
          </div>

          {uploadMutation.isPending && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Uploading...
            </div>
          )}

          {uploadMutation.isSuccess && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Uploaded successfully
              </div>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 text-sm font-monlam leading-relaxed bg-gray-50"
                rows={10}
                readOnly
                value={fileContent}
                placeholder="File content will appear here..."
              />
            </div>
          )}
        </div>
      )}

      {/* File size validation error */}
      {fileSizeError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 mb-1">
                File Size Exceeded
              </h4>
              <p className="text-sm text-red-700">{fileSizeError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload mutation error */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 mb-1">
                Upload Failed
              </h4>
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextUploader;
