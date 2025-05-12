import React from "react";
import { FileText, MoreVertical, Users } from "lucide-react";
import DocIcon from "@/assets/doc_icon.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  managePermissions: (e: React.MouseEvent) => void;
  view: "grid" | "list";
  status?: string;
  documentCount?: number;
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
  managePermissions,
  view,
  status,
  documentCount = 0,
}) => {
  if (view === "list") {
    return (
      <div className="flex items-center py-2 px-1 hover:bg-gray-50 rounded-md">
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
            {/* {status && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                {status}
              </span>
            )} */}
            {hasDocument && (
              <span className="ml-2 p-1 flex items-center">
                <FileText size={16} className="text-gray-400" />
                {documentCount > 0 && (
                  <span className="ml-1 text-xs text-gray-500">
                    {documentCount}
                  </span>
                )}
              </span>
            )}
            {hasSharedUsers && (
              <span className="ml-1 p-1">
                <Users size={16} className="text-gray-400" />
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 truncate">{subtitle}</p>
          )}
        </div>

        <div className="flex-shrink-0 text-sm text-gray-500 mx-4 w-36 text-right">
          {owner ?? "—"}
        </div>

        <div className="flex-shrink-0 text-sm text-gray-500 w-36">{date}</div>

        <div className="flex-shrink-0 ml-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full hover:bg-gray-100">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            {hasPermission && (
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={updateDocument}>
                  Update
                </DropdownMenuItem>
                <DropdownMenuItem onClick={managePermissions}>
                  Manage Permissions
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={deleteDocument}
                  className="text-red-500"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="space-y-2">
        <div className="flex items-center">
          <h3 className="text-sm font-medium truncate capitalize">{title}</h3>
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
                <Users size={16} className="text-gray-400" />
              </span>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full hover:bg-gray-100">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            {hasPermission && (
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={updateDocument}>
                  Update
                </DropdownMenuItem>
                <DropdownMenuItem onClick={managePermissions}>
                  Manage Permissions
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={deleteDocument}
                  className="text-red-500"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default ProjectItem;
