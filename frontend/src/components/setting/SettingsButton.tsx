import React from "react";
import { useTranslate } from "@tolgee/react";
import SettingsModal from "./SettingsModal";
import { useTranslationSidebarParams } from "@/hooks/useQueryParams";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GrSettingsOption } from "react-icons/gr";

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
        size="xs"
        className=" cursor-pointer flex gap-1 text-neutral-200 hover:text-neutral-400 px-2 items-center hover:bg-transparent"
      >
        <GrSettingsOption size={14} />
        <span className="text-sm">{t("common.settings", "Settings")}</span>
      </Button>
    </SettingsModal>
  );
};

export default SettingsButton;
