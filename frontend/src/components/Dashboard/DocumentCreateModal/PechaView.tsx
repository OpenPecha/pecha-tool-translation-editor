import { createDocumentWithContent } from "@/api/document";
import { fetchPechaBase } from "@/api/pecha";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SelectedPechaType } from "./Forms";

function PechaView({
  isRoot,
  rootId,
  selectedPecha,
  setRootId,
}: {
  readonly isRoot: boolean;
  readonly rootId?: string;
  readonly selectedPecha: SelectedPechaType;
  readonly setRootId?: (rootId: string) => void;
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
      if (rootId) {
        formData.append("rootId", rootId);
      }
      const response = await createDocumentWithContent(formData);
      if (setRootId) {
        setRootId(response?.id ?? "");
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

  if (showSuccess) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Pecha uploaded successfully!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return content ? (
    <div className="space-y-4">
      <Card className="gap-0">
        <CardHeader>
          <CardTitle className="text-lg flex gap-2">
            Pecha Preview{" "}
            <span className="flex flex-wrap gap-2">
              <Badge variant="outline">ID: {selectedPecha.id}</Badge>
              <Badge variant="outline">Type: {selectedPecha.type}</Badge>
              <Badge variant="outline">
                Language: {selectedPecha.language}
              </Badge>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="m-0">
          <Textarea
            value={content}
            rows={8}
            onChange={() => {}}
            className="font-monlam resize-none"
            placeholder="Pecha content will appear here..."
          />
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50 p-2">
        <CardContent className="">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Confirm Selection</h4>
                <p className="text-sm text-blue-700">
                  Please review the pecha content above. Make sure this is the
                  correct pecha you want to import.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleConfirm}
                disabled={uploadMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Confirm & Upload"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
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
  );
}

export default PechaView;
