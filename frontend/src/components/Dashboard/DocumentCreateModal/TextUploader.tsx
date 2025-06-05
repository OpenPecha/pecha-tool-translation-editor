import { useState } from "react";
import { Input } from "@/components/ui/input";
import { QueryObserverResult, useMutation } from "@tanstack/react-query";
import { createDocument } from "@/api/document";

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
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      const reader = new FileReader();
      reader.onload = (event) => {
        setFileContent(event.target?.result as string);
      };
      reader.readAsText(selectedFile);

      uploadMutation.mutate(selectedFile);
    }
  };

  const errorMessage = (uploadMutation.error as Error)?.message;

  const handleReset = () => {
    setFile(null);
    setFileContent("");
    uploadMutation.reset(); // Reset mutation state
  };
  return (
    <div className="mb-2">
      {!file && (
        <div className="flex flex-col gap-2">
          <label htmlFor="text-file" className="text-sm font-medium">
            Upload {isRoot ? "Root" : "Translation"} Text (.txt)
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
      {file && (
        <div className="text-sm py-2">
          <div className="flex justify-between items-center">
            <span>
              Selected file: <span className="font-medium">{file.name}</span>
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

      {errorMessage && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default TextUploader;
