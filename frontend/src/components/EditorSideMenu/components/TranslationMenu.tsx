import { useTranslation } from "react-i18next";
import { Edit, MoreVertical, Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Translation } from "../../DocumentWrapper";
import { Button } from "../../ui/button";
import EditTranslationModal from "./EditTranslationModal";

interface TranslationMenuProps {
  translation: Translation;
  onEdit: (name?: string, language?: string) => void;
  onDelete: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onModalOpenChange?: (isOpen: boolean) => void;
}

const TranslationMenu: React.FC<TranslationMenuProps> = ({
  translation,
  onEdit,
  onDelete,
  onModalOpenChange,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { t } = useTranslation();

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditModalOpen(true);
    onModalOpenChange?.(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    onModalOpenChange?.(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MoreVertical className="size-4 p-0 opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-gray-200" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-40 bg-neutral-50 dark:bg-neutral-800 border shadow-lg"
          onClick={(e) => e.stopPropagation()} // Prevent event bubbling on dropdown
        >
          <DropdownMenuItem
            onClick={handleEditClick}
            className="flex items-center gap-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <Edit className="h-4 w-4" />
            <span>{t("common.edit")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => onDelete(e)}
            className="flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
            <span>{t("common.delete")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditTranslationModal
        translation={translation}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onEdit={onEdit}
      />
    </>
  );
};

export default TranslationMenu;
