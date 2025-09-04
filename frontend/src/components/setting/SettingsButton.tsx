import React from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@tolgee/react";
import SettingsModal from "./SettingsModal";
import { useTranslationSidebarParams } from "@/hooks/useQueryParams";
import { useParams } from "react-router-dom";

const SettingsButton: React.FC = () => {
  const { t } = useTranslate();
  const { selectedTranslationId } = useTranslationSidebarParams();
  const { id } = useParams();

  return (
    <SettingsModal
      rootId={id}
      translationId={selectedTranslationId || undefined}
    >
      <Button
        variant="ghost"
        size="sm"
        className="cursor-pointer flex gap-1 text-gray-500 hover:text-gray-900 px-2 items-center hover:bg-transparent"
      >
        <Settings size={16} />
        <span className="text-sm">{t("common.settings", "Settings")}</span>
      </Button>
    </SettingsModal>
  );
};

export default SettingsButton;
