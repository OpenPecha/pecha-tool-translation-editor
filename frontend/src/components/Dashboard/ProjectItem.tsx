import React, { useState } from "react";
import { Delete, FileText, MoreVertical, Users, Share2 } from "lucide-react";
import DocIcon from "@/assets/doc_icon.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RiDeleteBin6Line } from "react-icons/ri";
import { BiRename } from "react-icons/bi";
import { useTranslate } from "@tolgee/react";

interface ProjectItemProps {
  title: string;
  subtitle?: string;
  date: string;
  owner?: string;
  hasDocument?: boolean;
  hasSharedUsers?: boolean;
  hasPermission?: boolean;
  updateDocument: (e: React.MouseEvent) => void;
  deleteDocument: (e: React.MouseEvent) => void;
  shareDocument: (e: React.MouseEvent) => void;
  view: "grid" | "list";
  status?: string;
  documentCount?: number;
  url?: string;
}

const ProjectItem: React.FC<ProjectItemProps> = ({
  title,
  subtitle,
  date,
  owner,
  hasDocument = false,
  hasSharedUsers = false,
  hasPermission = false,
  updateDocument,
  deleteDocument,
  shareDocument,
  view,
  documentCount = 0,
  url,
}) => {
  if (view === "list") {
    return (
      <div className="flex items-center py-2 px-1 border-b border-gray-200 hover:bg-blue-50 transition-all rounded-md">
        <div className="flex-shrink-0 mr-4">
          <img
            alt="icon"
            src={DocIcon}
            width={26}
            className=" object-contain"
          />
        </div>

        <div className="flex-grow min-w-0">
          <div className="flex items-center">
            <span className="text-sm font-medium truncate capitalize">
              {title}
            </span>

            {hasDocument && (
              <span className="ml-2 p-1 flex items-center">
                <FileText size={16} className="text-gray-500" />
                {documentCount > 0 && (
                  <span className="ml-1 text-xs text-gray-500">
                    {documentCount}
                  </span>
                )}
              </span>
            )}
            {hasSharedUsers && (
              <span className="ml-1 p-1">
                <Users size={16} className="text-gray-500" />
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 truncate leading-[normal]">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 text-sm text-gray-500 mx-4 w-36 text-right">
          {owner ?? "—"}
        </div>

        <div className="flex-shrink-0 text-sm text-gray-500 w-36">{date}</div>

        <div className="flex-shrink-0 ml-2">
          <ProjectItemDropdownMenu
            hasPermission={hasPermission}
            updateDocument={updateDocument}
            deleteDocument={deleteDocument}
            shareDocument={shareDocument}
            url={url}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="space-y-2">
        <div className="flex items-center">
          <div className="text-large font-medium truncate capitalize">
            {title}
          </div>
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 truncate">{subtitle}</p>
        )}

        <div className="flex items-center mt-2 justify-between">
          <div className="flex item-center">
            {hasDocument && (
              <div className="bg-blue-100 p-2 rounded-full flex gap-1 items-center mx-1">
                <FileText size={16} className="text-blue-500" />
                {documentCount > 0 && (
                  <span className=" text-xs font-medium text-blue-700">
                    {documentCount}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center text-xs text-gray-500">
              <span className="mr-2">{date}</span>
              {owner && <span>· {owner}</span>}
            </div>
            {hasSharedUsers && (
              <span>
                <Users size={16} className="text-gray-500" />
              </span>
            )}
          </div>
          <ProjectItemDropdownMenu
            hasPermission={hasPermission}
            updateDocument={updateDocument}
            deleteDocument={deleteDocument}
            shareDocument={shareDocument}
            url={url}
          />
        </div>
      </div>
    </div>
  );
};

function ProjectItemDropdownMenu({
  hasPermission,
  updateDocument,
  deleteDocument,
  shareDocument,
  url,
}: {
  readonly hasPermission: boolean;
  readonly updateDocument: (e: React.MouseEvent) => void;
  readonly deleteDocument: (e: React.MouseEvent) => void;
  readonly shareDocument: (e: React.MouseEvent) => void;
  readonly url?: string;
}) {
  const [open, setOpen] = useState(false);

  const handleOpenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen(true);
  };

  const handleCloseClick = (
    e: React.MouseEvent,
    func: (e: React.MouseEvent) => void
  ) => {
    setOpen(false);
    func(e);
  };

  const handleOpenInNewTab = (e: React.MouseEvent) => {
    e.preventDefault();
    if (url) {
      window.open(url, "_blank");
    }
    setOpen(false);
  };
  const { t } = useTranslate();
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="p-3  hover:bg-gray-200 rounded-lg"
          onClick={handleOpenClick}
        >
          <MoreVertical size={16} className="text-gray-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {hasPermission && (
          <>
            <DropdownMenuItem
              onClick={(e) => handleCloseClick(e, updateDocument)}
            >
              <BiRename /> {t("common.rename")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => handleCloseClick(e, deleteDocument)}
            >
              <RiDeleteBin6Line /> {t("common.remove")}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onClick={(e) => handleCloseClick(e, shareDocument)}>
          <Share2 size={16} /> Share
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenInNewTab}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
            fill="gray"
          >
            <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h560v-280h80v280q0 33-23.5 56.5T760-120H200Zm188-212-56-56 372-372H560v-80h280v280h-80v-144L388-332Z" />
          </svg>
          {t("common.openinnewtab")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
export default ProjectItem;
