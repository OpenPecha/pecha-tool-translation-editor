function TagOptions({
  selectedHtmlTag = "p",
  setSelectedHtmlTag,
}: {
  selectedHtmlTag: string;
  setSelectedHtmlTag: (tag: string) => void;
}) {
  const tags = [
    { label: "Para", value: "p" },
    { label: "H1", value: "h1" },
    { label: "H2", value: "h2" },
    { label: "H3", value: "h3" },
    { label: "Bold", value: "b" },
    { label: "Italic", value: "i" },
  ];

  return (
    <div className="flex flex-col gap-2 mt-2">
      <label className="text-sm font-medium text-gray-700">
        Select element to sync
      </label>
      <div className="relative">
        <select
          value={selectedHtmlTag}
          onChange={(e) => setSelectedHtmlTag(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {tags.map((tag) => (
            <option key={tag.value} value={tag.value}>
              {tag.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-gray-500">
        Clicking will sync the selected element type between documents
      </p>
    </div>
  );
}

export default TagOptions;
