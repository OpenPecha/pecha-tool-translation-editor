import { useState } from "react";
import { Input } from "@/components/ui/input";
import { QueryObserverResult, useMutation } from "@tanstack/react-query";
import { createDocument } from "@/api/document";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_DISPLAY,
  formatFileSize,
} from "@/utils/Constants";

// File size validation error types
type FileSizeError = {
  type: "FILE_TOO_LARGE";
  message: string;
  currentSize: number;
  maxSize: number;
};

type FileReadError = {
  type: "FILE_READ_ERROR";
  message: string;
};

type ValidationError = FileSizeError | FileReadError;

const TextUploader = ({
  isRoot,
  isPublic,
  selectedLanguage,
  setRootId,
  disable,
  rootId,
  refetchTranslations,
}: {
  isRoot: boolean;
  isPublic: boolean;
  selectedLanguage: string;
  setRootId: (id: string) => void;
  disable?: boolean;
  rootId?: string;
  refetchTranslations?: () => Promise<QueryObserverResult<any, Error>>;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [validationError, setValidationError] =
    useState<ValidationError | null>(null);

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

  /**
   * Validates file size before processing
   * @param file - File to validate
   * @returns ValidationError if invalid, null if valid
   */
  const validateFileSize = (file: File): ValidationError | null => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        type: "FILE_TOO_LARGE",
        message: `File size exceeds the maximum limit of ${MAX_FILE_SIZE_DISPLAY}. Please select a smaller file.`,
        currentSize: file.size,
        maxSize: MAX_FILE_SIZE_BYTES,
      };
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear previous errors
    setValidationError(null);

    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Immediate file size validation
      const sizeValidationError = validateFileSize(selectedFile);
      if (sizeValidationError) {
        setValidationError(sizeValidationError);
        // Clear the file input
        e.target.value = "";
        return;
      }

      setFile(selectedFile);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          setFileContent(event.target?.result as string);
          // Only trigger upload if file size is valid
          uploadMutation.mutate(selectedFile);
        } catch (error) {
          setValidationError({
            type: "FILE_READ_ERROR",
            message:
              "Failed to read file content. Please ensure the file is a valid text file.",
          });
          console.error("File reading error:", error);
        }
      };

      reader.onerror = () => {
        setValidationError({
          type: "FILE_READ_ERROR",
          message: "Failed to read file. Please try selecting the file again.",
        });
      };

      reader.readAsText(selectedFile);
    }
  };

  const errorMessage = (uploadMutation.error as Error)?.message;

  const handleReset = () => {
    setFile(null);
    setFileContent("");
    setValidationError(null);
    uploadMutation.reset(); // Reset mutation state
  };

  // Render validation error with specific styling and messaging
  const renderValidationError = () => {
    if (!validationError) return null;

    return (
      <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200 mt-2">
        <div className="flex items-start">
          <svg
            className="flex-shrink-0 w-5 h-5 text-red-400 mt-0.5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-red-800">
              {validationError.type === "FILE_TOO_LARGE"
                ? "File Too Large"
                : "File Read Error"}
            </h4>
            <p className="mt-1 text-sm text-red-700">
              {validationError.message}
            </p>
            {validationError.type === "FILE_TOO_LARGE" && (
              <div className="mt-2 text-xs text-red-600">
                <p>
                  Current file size:{" "}
                  <span className="font-medium">
                    {formatFileSize(validationError.currentSize)}
                  </span>
                </p>
                <p>
                  Maximum allowed:{" "}
                  <span className="font-medium">
                    {formatFileSize(validationError.maxSize)}
                  </span>
                </p>
                <p className="mt-1 font-medium">
                  💡 Tip: Try compressing your text file or splitting it into
                  smaller parts.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-2">
      {!file && (
        <div className="flex flex-col gap-2">
          <label htmlFor="text-file" className="text-sm font-medium">
            Upload {isRoot ? "Root" : "Translation"} Text (.txt)
            <span className="text-xs text-gray-500 ml-2">
              (Max size: {MAX_FILE_SIZE_DISPLAY})
            </span>
          </label>
          <Input
            id="text-file"
            type="file"
            accept=".txt"
            onChange={handleFileChange}
            disabled={
              disable || uploadMutation.isPending || uploadMutation.isSuccess
            }
          />
        </div>
      )}

      {/* Validation Error Display */}
      {renderValidationError()}

      {file && !validationError && (
        <div className="text-sm py-2">
          <div className="flex justify-between items-center">
            <span>
              Selected file: <span className="font-medium">{file.name}</span>
              <span className="text-xs text-gray-500 ml-2">
                ({formatFileSize(file.size)})
              </span>
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-red-600 text-xs underline ml-4"
            >
              Remove File
            </button>
          </div>
          {uploadMutation.isPending && (
            <span className="ml-2 text-amber-600 flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-amber-600"
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
            </span>
          )}
          {uploadMutation.isSuccess && (
            <div>
              <span className="ml-2 text-green-600">✓ Uploaded</span>
              <textarea
                className="mt-2 w-full border rounded-md p-2 text-md font-monlam leading-normal "
                rows={10}
                readOnly
                value={fileContent}
              />
            </div>
          )}
        </div>
      )}

      {/* Server/Upload Error Display */}
      {errorMessage && !validationError && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200 mt-2">
          <div className="flex items-start">
            <svg
              className="flex-shrink-0 w-5 h-5 text-red-400 mt-0.5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-red-800">
                Upload Failed
              </h4>
              <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextUploader;
