import React, { useEffect } from "react";
import {
  X,
  Home,
  Settings,
  User,
  BarChart2,
  FileText,
  Globe2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchTools } from "@/api/workspace/tools";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
}

const NavSidebar = ({ isOpen, onClose, trigger }: SidebarProps) => {
  // Close sidebar when pressing escape key
  useEffect(() => {
    const signal = new AbortController();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape, signal);
    return () => signal.abort();
  }, [isOpen, onClose]);
  const { data: toolList = [] } = useQuery({
    queryKey: ["tools"],
    queryFn: fetchTools,
  });
  // Prevent body scrolling when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isOpen]);

  const navItems = [
    {
      iconComponent: Home,
      name: "Workspace",
      link: "https://workspace.pecha.tools",
    },
    ...toolList,
    {
      iconComponent: Globe2Icon,
      name: "Forum",
      link: "https://forum.openpecha.org",
    },
  ];

  return (
    <>
      {trigger}
      {/* Backdrop overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40   transition-all duration-300",
          isOpen ? "opacity-100" : " pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-[280px] bg-background border-r shadow-lg transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="h-20 flex items-center p-6 border-b text-[#5f6368] font-google-sans text-xl tracking-widest">
            <span className="flex-1 font-semibold text-[#8e57f1]">
              {" "}
              <span className="text-[#12dfec]">Pecha</span>Tool
            </span>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems?.map((tool) => (
              <a
                key={tool.link}
                href={tool.link}
                className="flex items-center h-10 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
                onClick={(e) => e.preventDefault()}
              >
                {tool.iconComponent ? (
                  <tool.iconComponent className="h-4 w-4 mr-3" />
                ) : (
                  <img
                    src={tool.icon}
                    alt={tool.name}
                    className="h-4 w-4 mr-3"
                  />
                )}
                {tool.name}
              </a>
            ))}
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 border-t">
            <p className="text-sm text-muted-foreground">
              © 2025 My Application
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default NavSidebar;
