import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BsFillGrid3X3GapFill } from "react-icons/bs";
import { useQuery } from "@tanstack/react-query";
import { fetchTools } from "@/api/workspace/tools";

const AppLauncher: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { data: toolList, isLoading } = useQuery({
    queryKey: ["tools"],
    queryFn: fetchTools,
    staleTime: 1000 * 60 * 5, // 5 minutes (stays "fresh" for this duration)
  });

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
          {isLoading && <div>Loading...</div>}
          {toolList?.map((app) => (
            <a
              key={app.link}
              href={app.link}
              className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setOpen(false)}
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
