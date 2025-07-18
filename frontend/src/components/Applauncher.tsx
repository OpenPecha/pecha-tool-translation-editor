import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BsFillGrid3X3GapFill } from "react-icons/bs";
import { useQuery } from "@tanstack/react-query";
import { fetchTools } from "@/api/workspace/tools";
import { useUmamiTracking } from "@/hooks/use-umami-tracking";
import { getUserContext } from "@/hooks/use-umami-tracking";
import { useAuth } from "@/auth/use-auth-hook";

interface Tool {
  name: string;
  link: string;
  icon: string;
}

const AppLauncher: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { currentUser } = useAuth();
  const { trackButtonClicked, trackPageVisit } = useUmamiTracking();

  const { data: toolList, isLoading } = useQuery({
    queryKey: ["tools"],
    queryFn: fetchTools,
    staleTime: 1000 * 60 * 5, // 5 minutes (stays "fresh" for this duration)
  });

  const handleAppLauncherClick = () => {
    trackButtonClicked(
      "app_launcher",
      "app-launcher-button",
      getUserContext(currentUser)
    );
  };

  const handleToolClick = (toolName: string, toolLink: string) => {
    trackPageVisit(toolLink, window.location.pathname, {
      ...getUserContext(currentUser),
      navigation_type: "app_launcher",
      metadata: { tool_name: toolName },
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Open Apps"
          onClick={handleAppLauncherClick}
        >
          <BsFillGrid3X3GapFill size={20} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <div className="grid grid-cols-3 gap-2">
          {isLoading && <div>Loading...</div>}
          {toolList?.map((app: Tool) => (
            <a
              key={app.link}
              href={app.link}
              className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => handleToolClick(app.name, app.link)}
            >
              <img src={app.icon} alt={app.name} className="w-6 h-6" />
              <span className="text-xs text-center">{app.name}</span>
            </a>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AppLauncher;
