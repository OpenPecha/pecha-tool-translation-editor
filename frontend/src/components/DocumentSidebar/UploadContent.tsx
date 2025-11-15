import {
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useFetchDocument } from "@/api/queries/documents";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useOpenPechaUpload } from "@/hooks/useOpenPechaUpload";
import { useState } from "react";

// Upload content component for sidebar
const UploadContent = ({
  documentId,
  onClose
}: {
  documentId: string;
  onClose: () => void;
}) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch translation document
  const { data: translationDoc, isLoading: isLoadingTranslation } = useFetchDocument(documentId);

  // Get source document ID from translation document's rootId
  const sourceDocId = translationDoc?.rootId;

  // Fetch source document
  const { data: sourceDoc, isLoading: isLoadingSource } = useFetchDocument(sourceDocId || "");

  // Use upload hook
  const { onUpload, isUploading, error, isUploadable, instance_id } = useOpenPechaUpload({
    sourceDoc: sourceDoc || null,
    translationDoc: translationDoc || null,
  });

  const handleUploadClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmUpload = async () => {
    setShowConfirmDialog(false);
    const success = await onUpload();
    if (success) {
      setIsSuccess(true);
    }
  };

  const handleSuccessClose = () => {
    setIsSuccess(false);
    onClose();
  };

  if (isLoadingTranslation || isLoadingSource) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
          Loading...
        </span>
      </div>
    );
  }

  if (!translationDoc) {
    return (
      <div className="p-3 text-xs text-red-600 dark:text-red-400">
        Error loading translation document
      </div>
    );
  }

  if (isSuccess) {
    return (
      <ScrollArea className="h-full">
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <CheckCircle className="h-12 w-12 text-emerald-500" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              Upload complete
            </h3>
            <p className="text-sm text-muted-foreground">
              Your translation is now available on OpenPecha.
            </p>
          </div>
          <Button onClick={handleSuccessClose} className="w-full max-w-xs">
            Close
          </Button>
        </div>
      </ScrollArea>
    );
  }

  if (!isUploadable) {
    return (
      <ScrollArea className="h-full">
        <div className="flex h-full flex-col justify-center gap-4 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div className="space-y-2">
              <h3 className="text-base font-medium text-foreground">
                Upload not available
              </h3>
              <p className="text-sm text-muted-foreground">
                {!sourceDoc
                  ? "Source document could not be loaded."
                  : !sourceDoc.metadata?.instanceId && !sourceDoc.metadata?.instance_id
                    ? "Upload the source document to OpenPecha before publishing this translation."
                    : translationDoc.metadata?.instanceId || translationDoc.metadata?.instance_id
                      ? "This translation has already been published to OpenPecha."
                      : "The source document is missing the required OpenPecha metadata."}
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="flex h-full flex-col justify-between p-6">
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                OpenPecha
              </p>
              <h3 className="text-xl font-semibold text-foreground">
                Upload translation
              </h3>
              <p className="text-sm text-muted-foreground">
                Review the details before publishing this translation.
              </p>
            </div>

            <dl className="space-y-4 text-sm">
              <div className="space-y-1">
                <dt className="text-xs uppercase text-muted-foreground">
                  Title
                </dt>
                <dd className="text-foreground break-words">
                  {translationDoc.name || "Untitled translation"}
                </dd>
              </div>

              <div className="space-y-1">
                <dt className="text-xs uppercase text-muted-foreground">
                  Language
                </dt>
                <dd className="text-foreground">
                  {translationDoc.language || "Not specified"}
                </dd>
              </div>

              {instance_id && (
                <div className="space-y-1">
                  <dt className="text-xs uppercase text-muted-foreground">
                    Instance ID
                  </dt>
                  <dd className="font-mono text-sm text-foreground/80 break-all">
                    {instance_id}
                  </dd>
                </div>
              )}
            </dl>

            {error && (
              <p className="rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className="pt-6">
            <Button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </ScrollArea>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-sm space-y-4">
          <DialogHeader>
            <DialogTitle>Confirm upload</DialogTitle>
            <DialogDescription>
              This will publish the translation to OpenPecha. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
          <Button
              variant="ghost"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isUploading}
              className="w-full sm:w-auto cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={isUploading}
              className="w-full sm:w-auto cursor-pointer"
            >
              {isUploading ? "Uploading..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UploadContent;
