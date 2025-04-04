import { NewPechaForm, PechaFromOpenPecha } from "./Forms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Document } from "../DocumentList";

function DocumentCreateModal({
  documents,
  setShowCreateModal,
}: {
  readonly documents: Document[];
  readonly setShowCreateModal: (show: boolean) => void;
}) {
  return (
    <div className=" rounded-lg bg-white shadow-lg overflow-hidden relative">
      <div className="p-4 bg-gray-300 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-700 ">Document</h2>
        <button
          className="text-gray-500 hover:text-gray-700 text-xl"
          onClick={() => setShowCreateModal(false)}
        >
          &times;
        </button>
      </div>

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
            documents={documents}
            setShowCreateModal={setShowCreateModal}
          />
        </TabsContent>
        <TabsContent value="pechaFromOpenPecha">
          <PechaFromOpenPecha setShowCreateModal={setShowCreateModal} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DocumentCreateModal;
