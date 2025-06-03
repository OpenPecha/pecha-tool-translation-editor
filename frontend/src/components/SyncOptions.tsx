import React, { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import TagOptions from "./TagOptions";
import { useTableOfContentStore } from "@/stores/tableOfContentStore";

function SyncOptions({
  syncMode,
  setSyncMode,
  syncType,
  setSyncType,
}: {
  readonly syncMode: "scroll" | "click" | "none" | "table";
  readonly setSyncMode: (mode: "scroll" | "click" | "none" | "table") => void;
  readonly syncType: "heading" | "lineNumber";
  readonly setSyncType: (type: "heading" | "lineNumber") => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { setSynced } = useTableOfContentStore();

  const options = [
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
    },
    { value: "none", label: "No Sync", description: "No synchronization" },
  ];

  const getSelectedOption = () => {
    return options.find((option) => option.value === syncMode);
  };

  const renderButtonContent = () => {
    if (syncMode === "none") {
      return (
        <div className="flex flex-col">
          <span className="font-medium text-gray-500">Select sync option</span>
        </div>
      );
    } else {
      const selected = getSelectedOption();
      return (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{selected?.label}</span>
        </div>
      );
    }
  };

  const handleSyncModeChange = (
    mode: "scroll" | "click" | "none" | "table"
  ) => {
    setSyncMode(mode);
    setSynced(mode === "table");
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-100 rounded-lg">
      <div className="relative">
        {/* Custom Select Button */}
        <button
          type="button"
          className="flex items-center justify-between w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          onClick={() => setIsOpen(!isOpen)}
        >
          {renderButtonContent()}
          {isOpen ? (
            <FaChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <FaChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {/* Dropdown Menu */}
        {isOpen && (
          <div className="mt-1 z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg">
            <ul className="py-1 overflow-auto text-base">
              {options.map((option) => (
                <li
                  key={option.value}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                    syncMode === option.value
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-900"
                  }`}
                  onClick={() =>
                    handleSyncModeChange(
                      option.value as "scroll" | "click" | "none" | "table"
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{option.label}</p>
                    </div>
                    {syncMode === option.value && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {syncMode !== "none" && syncMode !== "table" && !isOpen && (
        <TagOptions syncType={syncType} setSyncType={setSyncType} />
      )}
    </div>
  );
}

export default SyncOptions;
