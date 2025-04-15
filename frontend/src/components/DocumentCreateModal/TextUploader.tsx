import { useState } from "react";
import { Input } from "../ui/input";
import { useMutation } from "@tanstack/react-query";
import { createDocument } from "@/api/document";

const TextUploader = ({
  isRoot,
  isPublic,
  selectedLanguage,
  setRootId,
}: {
  isRoot: boolean;
  isPublic: boolean;
  selectedLanguage: string;
  setRootId: (id: string) => void;
}) => {
  const [file, setFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      const uniqueIdentifier = `${fileNameWithoutExt}-${Date.now()}`;
      formData.append("identifier", uniqueIdentifier);
      formData.append("isRoot", isRoot.toString());
      formData.append("isPublic", isPublic.toString());
      formData.append("language", selectedLanguage);
      if (file) {
        formData.append("file", file);
      }
      const response = await createDocument(formData);
      console.log(response);
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
      uploadMutation.mutate(selectedFile);
    }
  };

  return (
    <>
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
            disabled={uploadMutation.isPending}
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
            <span className="ml-2 text-green-600">✓ Uploaded</span>
          )}
        </div>
      )}

      {uploadMutation.isError && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
          {uploadMutation.error?.message || "An error occurred while uploading"}
        </div>
      )}
    </>
  );
};

export default TextUploader;
