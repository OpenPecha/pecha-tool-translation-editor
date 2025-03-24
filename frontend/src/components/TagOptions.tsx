function TagOptions({
  selectedHtmlTag,
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
    <div className="space-x-4">
      {tags.map((tag) => (
        <div key={tag.value} className="inline-flex items-center">
          <input
            type="radio"
            id={`tag-${tag.value}`}
            name="htmlTag"
            value={tag.value}
            checked={selectedHtmlTag === tag.value}
            onChange={(e) => setSelectedHtmlTag(e.target.value)}
            className="form-radio h-4 w-4 text-blue-600"
          />
          <label htmlFor={`tag-${tag.value}`} className="ml-2 text-gray-700">
            {tag.label}
          </label>
        </div>
      ))}
    </div>
  );
}

export default TagOptions;
