import { createDocumentWithContent } from "@/api/document";
import { fetchPechaBase } from "@/api/pecha";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DocumentCreateModalFooter, SelectedPechaType } from "./Forms";

function PechaView({
  isRoot,
  selectedPecha,
  closeModal,
  handleCreateProject,
}: {
  readonly isRoot: boolean;
  readonly selectedPecha: SelectedPechaType;
  readonly closeModal: () => void;
  readonly handleCreateProject: (rootId: string) => void;
}) {
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    data: pecha,
    refetch,
    error,
    isPending,
  } = useQuery({
    queryKey: ["pecha", selectedPecha.id],
    queryFn: () => fetchPechaBase(selectedPecha.id),
    enabled: !!selectedPecha?.id,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      content,
      fileName,
    }: {
      content: string;
      fileName: string;
    }) => {
      const formData = new FormData();
      const uniqueIdentifier = `${fileName}-${Date.now()}`;
      formData.append("name", fileName);
      formData.append("identifier", uniqueIdentifier);
      formData.append("isRoot", isRoot.toString());
      formData.append("language", selectedPecha.language);
      formData.append("content", content);
      const response = await createDocumentWithContent(formData);
      if (response?.id) {
        const rootId = response?.id ?? "";
        handleCreateProject(rootId);
      }
      return response;
    },
    onError: (error) => {
      console.error("Upload error:", error);
    },
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000); // Hide success message after 3 seconds
    },
  });

  useEffect(() => {
    refetch();
  }, [selectedPecha?.id]);

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>Error: {error.message}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const contents = pecha?.bases
    ? Object.entries(pecha.bases).map(([key, value]) => ({
        id: key,
        content: value,
      }))
    : [];
  const content = contents.length > 0 ? (contents[0].content as string) : "";

  if (isPending) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading pecha content...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleConfirm = () => {
    if (!selectedPecha?.title || selectedPecha.title === "") {
      alert("Title not available");
      return;
    }
    uploadMutation.mutate({ content, fileName: selectedPecha.title });
  };

  return (
    <>
      {content ? (
        <div className="space-y-4">
          <span className="flex flex-wrap gap-2">
            <Badge variant="outline">ID: {selectedPecha.id}</Badge>
            <Badge variant="outline">Type: {selectedPecha.type}</Badge>
            <Badge variant="outline">Language: {selectedPecha.language}</Badge>
          </span>
          <Textarea
            value={content}
            rows={8}
            onChange={() => {}}
            className="font-monlam resize-none"
            placeholder="Pecha content will appear here..."
          />{" "}
          <DocumentCreateModalFooter
            createDoc={handleConfirm}
            closeModal={closeModal}
            disable={!selectedPecha?.language || selectedPecha.language === ""}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <AlertCircle className="mx-auto h-8 w-8 mb-2" />
              <p>No content available for this pecha</p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export default PechaView;
