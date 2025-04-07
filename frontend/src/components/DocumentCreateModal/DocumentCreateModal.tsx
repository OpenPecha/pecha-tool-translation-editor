import { NewPechaForm, PechaFromOpenPecha } from "./Forms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Document } from "../Dashboard/DocumentList";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useState } from "react";

function DocumentCreateModal({
  documents,
}: {
  readonly documents: Document[];
}) {
  const [open, setOpen] = useState(false);
  const closeModal = () => setOpen(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">+ Create pecha</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create pecha</DialogTitle>
          <DialogDescription>
            create openpecha from scratch or from existing openpecha
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="newPecha" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="newPecha" className="cursor-pointer">
              New Pecha
            </TabsTrigger>
            <TabsTrigger value="pechaFromOpenPecha" className="cursor-pointer">
              Pecha from OpenPecha
            </TabsTrigger>
          </TabsList>
          <TabsContent value="newPecha">
            <NewPechaForm documents={documents} closeModal={closeModal} />
          </TabsContent>
          <TabsContent value="pechaFromOpenPecha">
            <PechaFromOpenPecha closeModal={closeModal} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentCreateModal;
