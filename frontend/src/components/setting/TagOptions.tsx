function TagOptions({
  syncType,
  setSyncType,
}: {
  syncType: "heading" | "lineNumber";
  setSyncType: (type: "heading" | "lineNumber") => void;
}) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="mb-3">
        <label
          id="sync-method-label"
          className="text-sm font-medium mb-2 block"
        >
          Sync Method
        </label>
        <div className="flex gap-4" aria-labelledby="sync-method-label">
          <label className="inline-flex items-center">
            <input
              type="radio"
              id="line-number-sync"
              name="sync-type"
              className="form-radio h-4 w-4 text-secondary-600"
              checked={syncType === "lineNumber"}
              onChange={() => setSyncType("lineNumber")}
              aria-labelledby="sync-method-label line-number-label"
            />
            <span id="line-number-label" className="ml-2 text-sm">
              Line Number
            </span>
          </label>
        </div>
        <p className="text-xs mt-1">
          {syncType === "heading"
            ? "Sync by matching heading types and their positions"
            : "Sync by matching line positions between documents"}
        </p>
      </div>
    </div>
  );
}

export default TagOptions;
