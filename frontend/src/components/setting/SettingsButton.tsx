import React from "react";
import SettingsModal from "./SettingsModal";
import { useTranslationSidebarParams } from "@/hooks/useQueryParams";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GrSettingsOption } from "react-icons/gr";

const SettingsButton: React.FC = () => {
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
        className="w-fit cursor-pointer flex gap-1  py-3 hover:bg-transparent"
      >
        <span className="text-sm">Editor Settings</span>
        <GrSettingsOption size={14} />
      </Button>
    </SettingsModal>
  );
};

export default SettingsButton;
