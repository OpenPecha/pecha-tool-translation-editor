import { NewPechaForm, PechaFromOpenPecha } from "./Forms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDocuments } from "../../api/document";
function DocumentCreateModal() {
  const [open, setOpen] = useState(false);
  const closeModal = () => setOpen(false);
  const rootDocuments = useQuery({
    queryKey: ["root-documents"],
    queryFn: () => fetchDocuments({ isRoot: true }),
    enabled: open, // Only fetch when modal is open
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="cursor-pointer ">
        <div className="border rounded-lg p-4 flex items-center justify-center hover:border-blue-500 cursor-pointer mb-12 bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center">
            <div className=" p-4 rounded-full flex items-center justify-center  transition-colors">
              <img src="/icon/plus.png" width={70} alt="" />
            </div>
            <p className="mt-4 text-sm text-gray-600">Create New Project</p>
          </div>
        </div>
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
            <NewPechaForm
              documents={rootDocuments?.data || []}
              closeModal={closeModal}
            />
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
