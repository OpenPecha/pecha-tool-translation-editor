import { useTranslation } from "react-i18next";
import PlusIcon from "@/assets/plus.svg";
import { BaseModal } from "@/components/shared/modals/BaseModal";
import { StepIndicator } from "./StepIndicator";
import { StepRenderer } from "./StepRenderer";
import { ModalNavigation } from "./ModalNavigation";
import {
  DocumentCreateModalProvider,
  useDocumentCreateModalContext
} from "@/contexts/DocumentCreateModalContext";

function DocumentCreateModalContent() {
  const { t } = useTranslation();
  const { state, totalSteps, handleModalOpenChange, handleCreateButtonClick } =
    useDocumentCreateModalContext();

  const trigger = (
    <div
      className="flex-shrink-0 cursor-pointer group"
      style={{ width: "180px" }}
    >
      <div className="space-y-2">
        <button
          type="button"
          className="border-2 bg-white border-dashed border-border hover:border-primary/60 transition-all duration-300 h-[180px] hover:shadow-lg rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-secondary-500"
          onClick={handleCreateButtonClick}
        >
          <div className="p-0 flex flex-col items-center justify-center h-full">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
              style={{ background: "var(--gradient-primary)" }}
            >
              <img src={PlusIcon} width={50} height={50} alt="Create project" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {t("project.blank")}
            </p>
          </div>
        </button>
        <div className="space-y-0.5 px-1">
          <h3 className="text-sm font-medium text-foreground line-clamp-1">
            {t("projects.createProject")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("project.startFromScratch")}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <BaseModal
      open={state.open}
      onOpenChange={handleModalOpenChange}
      trigger={trigger}
      title={t("projects.createProject")}
      size="lg"
      variant="fixed"
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <StepIndicator currentStep={state.currentStep} totalSteps={totalSteps} />
          <StepRenderer />
        </div>
        <ModalNavigation />
      </div>
    </BaseModal>
  );
}

function DocumentCreateModal() {
  return (
    <DocumentCreateModalProvider>
      <DocumentCreateModalContent />
    </DocumentCreateModalProvider>
  );
}

export default DocumentCreateModal;
