import React, { useState } from "react";
import { Square } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FileText, Image, Headphones, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { BsFillGrid3X3GapFill } from "react-icons/bs";
interface AppItem {
  title: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const AppLauncher: React.FC = () => {
  const [open, setOpen] = useState(false);

  const apps: AppItem[] = [
    {
      title: "Translator Editor",
      icon: <FileText size={24} />,
      path: "#",
      color: "bg-blue-300",
    },
    {
      title: "Image Transcriber",
      icon: <Image size={24} />,
      path: "#",
      color: "bg-purple-300",
    },
    {
      title: "Audio Transcriber",
      icon: <Headphones size={24} />,
      path: "#",
      color: "bg-blue-300",
    },
    {
      title: "Proofreading Editor",
      icon: <Edit size={24} />,
      path: "#",
      color: "bg-purple-300",
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Open Apps"
        >
          <BsFillGrid3X3GapFill size={20} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <div className="grid grid-cols-3 gap-2">
          {apps.map((app) => (
            <Link
              key={app.title}
              to={app.path}
              className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setOpen(false)}
            >
              <div className={`${app.color} p-2 rounded-full text-white mb-1`}>
                {app.icon}
              </div>
              <span className="text-xs text-center">{app.title}</span>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AppLauncher;
