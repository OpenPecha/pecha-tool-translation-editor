import { useState } from "react";
import { Input } from "../ui/input";
import { useMutation } from "@tanstack/react-query";
import { createDocument } from "@/api/document";

const TextUploader = ({
  isRoot,
  isPublic,
  selectedLanguage,
  setRootId,
  disable,
  rootId,
}: {
  isRoot: boolean;
  isPublic: boolean;
  selectedLanguage: string;
  setRootId: (id: string) => void;
  disable?: boolean;
  rootId?: string;
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
            disabled={disable || uploadMutation.isPending}
          />
        </div>
      )}
      {file && (
        <div className="text-sm py-2">
          Selected file: <span className="font-medium">{file.name}</span>
          {uploadMutation.isPending && (
            <span className="ml-2 text-amber-600">Uploading...</span>
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

      {uploadMutation.isError && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
          {uploadMutation.error?.message || "An error occurred while uploading"}
        </div>
      )}
    </div>
  );
};

export default TextUploader;
