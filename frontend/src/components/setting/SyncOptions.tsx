import TagOptions from "./TagOptions";
import {
  useTableOfContentSyncStore,
  useTableOfContentOpenStore,
} from "@/stores/tableOfContentStore";

type SyncMode = "scroll" | "click" | "none" | "table";
type SyncType = "heading" | "lineNumber";

function SyncOptions({
  syncMode,
  setSyncMode,
  syncType,
  setSyncType,
}: {
  readonly syncMode: SyncMode;
  readonly setSyncMode: (mode: SyncMode) => void;
  readonly syncType: SyncType;
  readonly setSyncType: (type: SyncType) => void;
}) {
  const { setSynced } = useTableOfContentSyncStore();
  const { openAll } = useTableOfContentOpenStore();

  const options = [
    { value: "none", 
      label: "No Sync", 
      description: "No synchronization" 
    },
    {
      value: "scroll",
      label: "Scroll Sync",
      description: "Synchronize based on scrolling",
    },
    {
      value: "click",
      label: "Click Sync",
      description: "Synchronize based on clicking",
    },
    {
      value: "table",
      label: "Table Sync",
      description: "Synchronize based on table of contents",
    }
  ];

  const handleSyncModeChange = (mode: SyncMode) => {
    setSyncMode(mode);
    setSynced(mode === "table");
    if (mode === "table") {
      openAll();
    }
  };

  return (
    <div className="flex  gap-4 rounded-lg">
      <div className="flex w-full items-center justify-between ">
        {options.map((option) => (
          <label
            key={option.value}
            htmlFor={`sync-${option.value}`}
            aria-label={`${option.label}: ${option.description}`}
            className="flex items-center space-x-3 cursor-pointer rounded-md  hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <input
              type="radio"
              id={`sync-${option.value}`}
              name="syncMode"
              value={option.value}
              checked={syncMode === option.value}
              onChange={() =>
                handleSyncModeChange(option.value as SyncMode)
              }
              className="h-4 w-4 text-secondary-600 focus:ring-secondary-500 border-gray-300"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {option.label}
              </div>
              {/* <div className="text-sm text-gray-500 dark:text-gray-400">
                {option.description}
              </div> */}
            </div>
          </label>
        ))}
      </div>

    
    </div>
  );
}

export default SyncOptions;
