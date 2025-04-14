import React, { useEffect } from "react";
import { X, Home, Settings, User, BarChart2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
    { icon: Home, label: "Workspace", href: "https://workspace.pecha.tools" },
    { icon: FileText, label: "Documents", href: "#" },
  ];

  return (
    <>
      {trigger}
      {/* Backdrop overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-all duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
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
          <div className="h-14 flex items-center px-4 border-b">
            <div className="flex-1 font-semibold">Pecha Tool</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close sidebar</span>
            </Button>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center h-10 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
                onClick={
                  item.href === "#" ? (e) => e.preventDefault() : undefined
                }
              >
                <item.icon className="h-4 w-4 mr-3" />
                {item.label}
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
