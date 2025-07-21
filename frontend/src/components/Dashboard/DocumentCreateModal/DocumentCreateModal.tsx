import { NewPechaForm } from "./Forms";
import {
  BaseModal,
  UploadMethodTabs,
  TabContentWrapper,
  type UploadMethod,
} from "@/components/shared/modals";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import PlusIcon from "@/assets/plus.svg";
import { useTranslate } from "@tolgee/react";
import { useUmamiTracking } from "@/hooks/use-umami-tracking";
import { getUserContext } from "@/hooks/use-umami-tracking";
import { useAuth } from "@/auth/use-auth-hook";

function DocumentCreateModal() {
  const [projectName, setProjectName] = useState("");
  const [open, setOpen] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>("file");
  const { t } = useTranslate();
  const { currentUser } = useAuth();
  const { trackModalOpened, trackModalClosed, trackButtonClicked } =
    useUmamiTracking();

  const closeModal = () => {
    setOpen(false);
    trackModalClosed("project_creation", getUserContext(currentUser));
  };

  const handleOpenModal = () => {
    setOpen(true);
    trackModalOpened("project_creation", getUserContext(currentUser));
  };

  const handleCreateButtonClick = () => {
    trackButtonClicked(
      "create_project",
      "create-project-trigger",
      getUserContext(currentUser)
    );
    handleOpenModal();
  };

  const trigger = (
    <div
      className="border w-46 rounded-xl p-6 flex items-center justify-center hover:border-blue-400 hover:shadow-lg cursor-pointer mb-12 bg-white shadow-sm transition-all duration-200 group"
      onClick={handleCreateButtonClick}
    >
      <div className="flex flex-col items-center justify-center">
        <div className="p-4 rounded-full flex items-center justify-center transition-transform group-hover:scale-105">
          <img src={PlusIcon} width={90} alt="Create project" />
        </div>
        <p className="mt-2 text-sm text-gray-600 font-medium">
          {t(`projects.createProject`)}
        </p>
      </div>
    </div>
  );

  return (
    <BaseModal
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={t(`projects.createProject`)}
      size="lg"
    >
      <div className="space-y-6">
        {/* Project Name Input */}
        <div className=" flex gap-3 items-center">
          <Label
            htmlFor="projectName"
            className="text-sm font-medium text-gray-700 flex-shrink-0"
          >
            {t(`projects.projectName`)}
          </Label>
          <Input
            id="projectName"
            value={projectName}
            className="w-full border-gray-300 flex-1 focus:border-blue-500 focus:ring-blue-500"
            onChange={(e) => setProjectName(e.target.value)}
            placeholder={t(`projects.enterProjectName`)}
          />
        </div>

        {/* Upload Method Tabs */}
        <UploadMethodTabs
          activeMethod={uploadMethod}
          onMethodChange={setUploadMethod}
          availableMethods={["file", "openpecha"]}
        >
          <TabContentWrapper value="file">
            <NewPechaForm projectName={projectName} closeModal={closeModal} />
          </TabContentWrapper>

          <TabContentWrapper value="openpecha">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🚧</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Coming Soon
              </h3>
              <p className="text-gray-600 max-w-sm">
                OpenPecha integration is currently in development. Please use
                file upload for now.
              </p>
            </div>
          </TabContentWrapper>
        </UploadMethodTabs>
      </div>
    </BaseModal>
  );
}

export default DocumentCreateModal;
