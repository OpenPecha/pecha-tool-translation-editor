import React from 'react'

function SyncOptions({ syncMode, setSyncMode }: { syncMode: "scroll" | "click" | "none"; setSyncMode: (mode: "scroll" | "click" | "none") => void }) {
  return (
    <div className="flex gap-4">
    <label className="flex items-center gap-2">
      <input
        type="radio"
        name="syncMode"
        value="scroll"
        checked={syncMode === "scroll"}
        onChange={() => setSyncMode("scroll")}
      />
      <span>Scroll Sync</span>
    </label>
    <label className="flex items-center gap-2">
      <input
        type="radio"
        name="syncMode"
        value="click"
        checked={syncMode === "click"}
        onChange={() => setSyncMode("click")}
      />
      <span>Click Sync</span>
    </label>
    <label className="flex items-center gap-2">
      <input
        type="radio"
        name="syncMode"
        value="none"
        checked={syncMode === "none"}
        onChange={() => setSyncMode("none")}
      />
      <span>No Sync</span>
    </label>
  </div>
  )
}

export default SyncOptions
