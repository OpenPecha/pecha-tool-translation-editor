import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { CheckCircle, Upload } from "lucide-react";

interface UploadToOpenPechaProps {
  onUpload: () => Promise<boolean>;
  isUploading: boolean;
  error: string | null;
  isUploadable: boolean;
  translationTitle: string;
  translationLanguage: string;
}

export function UploadToOpenPecha({
  onUpload,
  isUploading,
  error,
  isUploadable,
  translationTitle,
  translationLanguage,
}: UploadToOpenPechaProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleConfirmUpload = async () => {
    const success = await onUpload();
    if (success) {
      setIsSuccess(true);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (isUploading) {
      return;
    }
    setIsOpen(open);
    if (!open) {
      setIsSuccess(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          title={isUploadable ? `Upload to OpenPecha` : "Source document is not uploaded to OpenPecha"}
          disabled={!isUploadable}
        >
          <Upload className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center p-6">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <DialogTitle>Upload Successful</DialogTitle>
            <DialogDescription>
              Your translation has been uploaded successfully.
            </DialogDescription>
            <DialogFooter className="mt-6">
              <Button onClick={() => setIsOpen(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Upload</DialogTitle>
              <DialogDescription>
                You are about to upload this translation to OpenPecha.
              </DialogDescription>
            </DialogHeader>
            <div>
              <p>
                <strong>Title:</strong> {translationTitle}
              </p>
              <p>
                <strong>Language:</strong> {translationLanguage}
              </p>
            </div>
            {error && <p className="text-red-500">{error}</p>}
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setIsOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmUpload} disabled={isUploading}>
                {isUploading ? "Uploading..." : "Confirm"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
