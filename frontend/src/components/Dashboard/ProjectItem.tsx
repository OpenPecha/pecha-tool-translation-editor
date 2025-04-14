import React from "react";
import { FileText, MoreVertical, Users } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectItemProps {
  title: string;
  date: string;
  owner?: string;
  hasDocument?: boolean;
  hasSharedUsers?: boolean;
  hasPermission?: boolean;
  updateDocument: (e: React.MouseEvent) => void;
  deleteDocument: (e: React.MouseEvent) => void;
}

const ProjectItem: React.FC<ProjectItemProps> = ({
  title,
  date,
  owner,
  hasDocument = false,
  hasSharedUsers = false,
  hasPermission = false,
  updateDocument,
  deleteDocument,
}) => {
  return (
    <div className="flex items-center py-2 px-1 hover:bg-gray-50 rounded-md">
      <div className="flex-shrink-0 mr-4">
        <div className="bg-blue-100 p-2 rounded-full">
          <FileText size={20} className="text-blue-500" />
        </div>
      </div>

      <div className="flex-grow min-w-0">
        <div className="flex items-center">
          <h3 className="text-sm font-medium truncate">{title}</h3>
          {hasDocument && (
            <span className="ml-2 p-1">
              <FileText size={16} className="text-gray-400" />
            </span>
          )}
          {hasSharedUsers && (
            <span className="ml-1 p-1">
              <Users size={16} className="text-gray-400" />
            </span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 text-sm text-gray-500 mx-4 w-36 text-right">
        {owner ? owner : "—"}
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
};

export default ProjectItem;
