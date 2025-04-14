import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FileText, Image, Headphones, Edit } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  path: string;
}

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
}

const SidebarMenu: React.FC<SidebarMenuProps> = ({
  isOpen,
  onClose,
  trigger,
}) => {
  const location = useLocation();

  const menuItems: MenuItem[] = [
    {
      title: "Translator Editor",
      icon: <FileText size={20} />,
      path: "/translator",
    },
    {
      title: "Image Transcriber",
      icon: <Image size={20} />,
      path: "/image-transcriber",
    },
    {
      title: "Audio Transcriber",
      icon: <Headphones size={20} />,
      path: "/audio-transcriber",
    },
    {
      title: "Proofreading Editor",
      icon: <Edit size={20} />,
      path: "/proofreading",
    },
  ];

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="h-[90%] rounded-t-xl p-0">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="bg-pecha-primary p-2 rounded-full">
              <FileText size={20} className="text-white" />
            </div>
            <span className="font-semibold">pecha.tools</span>
          </div>
        </div>
        <div className="p-2">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.title}>
                <DrawerClose asChild>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 p-3 rounded-md ${
                      location.pathname === item.path
                        ? "bg-gray-100 font-medium"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </DrawerClose>
              </li>
            ))}
          </ul>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default SidebarMenu;
