import React, { useState } from "react";

import { FaCog } from "react-icons/fa";
import SyncOptions from "./SyncOptions";
import useScrollHook from "@/hooks/useScrollHook";
import { useEditor } from "@/contexts/EditorContext";
import { BiSync } from "react-icons/bi";

function MenuDrawer({
  rootId,
  translationId,
}: {
  readonly rootId: string;
  readonly translationId: string;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { getQuill } = useEditor();
  const quill1 = getQuill(rootId);
  const quill2 = getQuill(translationId);
  const { syncMode, setSyncMode, syncType, setSyncType } = useScrollHook(
    quill1,
    quill2
  );
  return (
    <>
      {/* sync setting */}
      <button
        onClick={() => setIsDrawerOpen(true)}
        aria-label="Settings"
        className="cursor-pointer flex gap-1 bg-gray-700 text-white px-2 items-center"
      >
        <BiSync />
        Sync options
      </button>

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-[999] ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Sync options</h3>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <SyncOptions
            syncMode={syncMode}
            setSyncMode={setSyncMode}
            syncType={syncType}
            setSyncType={setSyncType}
          />
        </div>
      </div>

      {/* Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.3)] bg-opacity-50 z-[998]"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}
    </>
  );
}

export default MenuDrawer;
