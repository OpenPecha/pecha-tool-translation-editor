import { NewPechaForm, PechaFromOpenPecha } from "./Forms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import PlusIcon from "@/assets/plus.svg";
import { useTranslation } from "react-i18next";
function DocumentCreateModal() {
  const [projectName, setProjectName] = useState("");
  const [open, setOpen] = useState(false);
  const closeModal = () => setOpen(false);
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="cursor-pointer ">
        <div className="border rounded-lg p-4 flex items-center justify-center hover:border-blue-500 cursor-pointer mb-12 bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center">
            <div className=" p-4 rounded-full flex items-center justify-center  transition-colors">
              <img src={PlusIcon} width={90} alt="" />
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[60%] w-[95%] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {t(`projects.createProject`)}
          </DialogTitle>
        </DialogHeader>
        <div className="grid w-full items-center gap-1.5 mb-2">
          <Label htmlFor="projectName">{t(`projects.projectName`)}</Label>
          <Input
            id="projectName"
            value={projectName}
            className="w-full"
            onChange={(e) => setProjectName(e.target.value)}
            placeholder={t(`projects.enterProjectName`)}
          />
        </div>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="cursor-pointer">
              {t("common.file")}
            </TabsTrigger>
            <TabsTrigger value="OpenPecha" className="cursor-pointer">
              {t("common.openpecha")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload">
            <NewPechaForm projectName={projectName} closeModal={closeModal} />
          </TabsContent>
          <TabsContent value="OpenPecha">
            <PechaFromOpenPecha
              projectName={projectName}
              closeModal={closeModal}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentCreateModal;
